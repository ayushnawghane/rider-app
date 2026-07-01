-- BlinkCar — notifications, seat integrity & push support
-- Run this AFTER schema.sql, rewards_schema.sql and ride_messages.sql.
--
-- What this migration fixes:
--   1. In-app notifications could never be created from the app: the
--      `notifications` table had SELECT/UPDATE policies but NO INSERT policy,
--      so every client insert failed with RLS error 42501. We now create
--      notifications server-side via SECURITY DEFINER triggers (which bypass
--      RLS safely) whenever the events that matter happen.
--   2. A passenger joining a ride could not update `rides.booked_seats`
--      (only the ride owner may update a ride), so the seat count never
--      changed and rides could be over-booked. A trigger now keeps
--      `booked_seats` in sync with `ride_participants` automatically.
--   3. Adds `profiles.fcm_token` used by the push edge function.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Notifications: allow a user to insert their OWN notifications, and add a
--    SECURITY DEFINER helper so server-side code/triggers can notify anyone.
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.create_notification(
    target_user_id UUID,
    notification_title TEXT,
    notification_message TEXT,
    notification_type TEXT DEFAULT 'system'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id UUID;
    wants_notifications BOOLEAN;
BEGIN
    -- Respect the recipient's notification preference.
    SELECT COALESCE(notification_preferences, true)
      INTO wants_notifications
      FROM profiles WHERE id = target_user_id;

    IF wants_notifications IS DISTINCT FROM TRUE THEN
        RETURN NULL;
    END IF;

    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        target_user_id,
        notification_title,
        notification_message,
        CASE WHEN notification_type IN ('ride', 'dispute', 'system') THEN notification_type ELSE 'system' END
    )
    RETURNING id INTO new_id;

    -- Best-effort email fan-out via the notify-email edge function using pg_net.
    -- Only fires when both the function URL and pg_net are available; any failure
    -- here is swallowed so it can never block the in-app notification.
    -- Configure once with:
    --   ALTER DATABASE postgres SET app.notify_email_url = 'https://<ref>.functions.supabase.co/notify-email';
    --   ALTER DATABASE postgres SET app.notify_email_hook_secret = '<NOTIFY_EMAIL_HOOK_SECRET>';
    BEGIN
        IF current_setting('app.notify_email_url', true) IS NOT NULL
           AND current_setting('app.notify_email_url', true) <> '' THEN
            PERFORM net.http_post(
                url := current_setting('app.notify_email_url', true),
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'x-hook-secret', COALESCE(current_setting('app.notify_email_hook_secret', true), '')
                ),
                body := jsonb_build_object(
                    'userId', target_user_id,
                    'subject', notification_title,
                    'message', notification_message
                )
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- pg_net not installed / transient failure: ignore, keep the in-app row.
        NULL;
    END;

    RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Auto-notify on ride join / leave (fires for BOTH driver and passenger).
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_ride_participation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ride_record rides%ROWTYPE;
    passenger_name TEXT;
BEGIN
    SELECT * INTO ride_record FROM rides WHERE id = NEW.ride_id;
    IF ride_record.id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(full_name, 'A passenger') INTO passenger_name FROM profiles WHERE id = NEW.user_id;

    -- Joined (insert, or a re-join via status change to 'joined').
    IF NEW.status = 'joined'
       AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'joined')) THEN
        PERFORM public.create_notification(
            ride_record.user_id,
            'New passenger joined',
            passenger_name || ' joined your ride from ' || ride_record.start_location || ' to ' || ride_record.end_location || '.',
            'ride'
        );
        PERFORM public.create_notification(
            NEW.user_id,
            'Ride booked',
            'You booked a ride from ' || ride_record.start_location || ' to ' || ride_record.end_location || '.',
            'ride'
        );
    END IF;

    -- Cancelled participation.
    IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status = 'joined' THEN
        PERFORM public.create_notification(
            ride_record.user_id,
            'Passenger cancelled',
            passenger_name || ' cancelled their booking on your ride from ' || ride_record.start_location || ' to ' || ride_record.end_location || '.',
            'ride'
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_ride_participation ON ride_participants;
CREATE TRIGGER trigger_notify_ride_participation
    AFTER INSERT OR UPDATE OF status ON ride_participants
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_ride_participation();

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Auto-notify the receiver on a new ride chat message.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_ride_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sender_name TEXT;
BEGIN
    SELECT COALESCE(full_name, 'Someone') INTO sender_name FROM profiles WHERE id = NEW.sender_id;
    PERFORM public.create_notification(
        NEW.receiver_id,
        'New message from ' || sender_name,
        LEFT(NEW.content, 120),
        'ride'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_ride_message ON ride_messages;
CREATE TRIGGER trigger_notify_ride_message
    AFTER INSERT ON ride_messages
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_ride_message();

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Notify participants when a ride is cancelled or completed by the driver.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_ride_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    participant RECORD;
    status_title TEXT;
    status_body TEXT;
BEGIN
    IF NEW.status = OLD.status OR NEW.status NOT IN ('cancelled', 'completed') THEN
        RETURN NEW;
    END IF;

    IF NEW.status = 'cancelled' THEN
        status_title := 'Ride cancelled';
        status_body := 'Your ride from ' || NEW.start_location || ' to ' || NEW.end_location || ' was cancelled.';
    ELSE
        status_title := 'Ride completed';
        status_body := 'Your ride from ' || NEW.start_location || ' to ' || NEW.end_location || ' is complete. Safe travels!';
    END IF;

    FOR participant IN
        SELECT user_id FROM ride_participants WHERE ride_id = NEW.id AND status = 'joined'
    LOOP
        PERFORM public.create_notification(participant.user_id, status_title, status_body, 'ride');
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_ride_status_change ON rides;
CREATE TRIGGER trigger_notify_ride_status_change
    AFTER UPDATE OF status ON rides
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_ride_status_change();

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Keep rides.booked_seats accurate from ride_participants (SECURITY DEFINER
--    so it works no matter which participant triggers the change).
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_ride_booked_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected_ride UUID := COALESCE(NEW.ride_id, OLD.ride_id);
    total_seats INTEGER;
BEGIN
    SELECT COALESCE(SUM(seats_booked), 0)
      INTO total_seats
      FROM ride_participants
     WHERE ride_id = affected_ride AND status = 'joined';

    UPDATE rides SET booked_seats = total_seats, updated_at = NOW()
     WHERE id = affected_ride;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_booked_seats ON ride_participants;
CREATE TRIGGER trigger_sync_booked_seats
    AFTER INSERT OR UPDATE OF status, seats_booked OR DELETE ON ride_participants
    FOR EACH ROW EXECUTE FUNCTION public.sync_ride_booked_seats();

-- Backfill existing rows once.
UPDATE rides r
SET booked_seats = COALESCE(sub.total, 0)
FROM (
    SELECT ride_id, SUM(seats_booked) AS total
    FROM ride_participants WHERE status = 'joined' GROUP BY ride_id
) sub
WHERE r.id = sub.ride_id;

-- ──────────────────────────────────────────────────────────────────────────
-- 6. Push support: device token used by the send-notification edge function.
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- ──────────────────────────────────────────────────────────────────────────
-- 7. Realtime: notifications, ride chat, AND dispute chat stream to the app.
--    (dispute chat replies were never received live because `messages` wasn't
--    in the realtime publication.)
-- ──────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ride_messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 8. Admin access. The schema deliberately has no admin RLS (a policy on
--    `profiles` that queries `profiles` recurses). A SECURITY DEFINER helper
--    breaks the recursion, letting the admin console actually read all data
--    instead of silently seeing only the admin's own rows.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all rides" ON rides;
CREATE POLICY "Admins can view all rides" ON rides FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all disputes" ON disputes;
CREATE POLICY "Admins can view all disputes" ON disputes FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update disputes" ON disputes;
CREATE POLICY "Admins can update disputes" ON disputes FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all sos alerts" ON sos_alerts;
CREATE POLICY "Admins can view all sos alerts" ON sos_alerts FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view dispute messages" ON messages;
CREATE POLICY "Admins can view dispute messages" ON messages FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can send dispute messages" ON messages;
CREATE POLICY "Admins can send dispute messages" ON messages FOR INSERT WITH CHECK (public.is_admin());
