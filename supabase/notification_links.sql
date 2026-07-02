-- Deep-linkable notifications.
-- Each notification carries a `link` (an in-app route) so tapping it opens the
-- relevant screen. create_notification gains an optional link arg and the
-- notify triggers pass the right destination.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- Recreate create_notification with the extra `notification_link` argument.
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_notification(
    target_user_id UUID,
    notification_title TEXT,
    notification_message TEXT,
    notification_type TEXT DEFAULT 'system',
    notification_link TEXT DEFAULT NULL
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
    SELECT COALESCE(notification_preferences, true)
      INTO wants_notifications
      FROM profiles WHERE id = target_user_id;

    IF wants_notifications IS DISTINCT FROM TRUE THEN
        RETURN NULL;
    END IF;

    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
        target_user_id,
        notification_title,
        notification_message,
        CASE WHEN notification_type IN ('ride', 'dispute', 'system') THEN notification_type ELSE 'system' END,
        notification_link
    )
    RETURNING id INTO new_id;

    -- Best-effort email fan-out via pg_net (unchanged; swallowed on failure).
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
        NULL;
    END;

    RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Ride join / cancel → link to the ride detail.
CREATE OR REPLACE FUNCTION public.notify_on_ride_participation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ride_record rides%ROWTYPE;
    passenger_name TEXT;
    ride_link TEXT;
BEGIN
    SELECT * INTO ride_record FROM rides WHERE id = NEW.ride_id;
    IF ride_record.id IS NULL THEN RETURN NEW; END IF;

    SELECT COALESCE(full_name, 'A passenger') INTO passenger_name FROM profiles WHERE id = NEW.user_id;
    ride_link := '/rides/detail/' || ride_record.id;

    IF NEW.status = 'joined'
       AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'joined')) THEN
        PERFORM public.create_notification(
            ride_record.user_id, 'New passenger joined',
            passenger_name || ' joined your ride from ' || ride_record.start_location || ' to ' || ride_record.end_location || '.',
            'ride', ride_link);
        PERFORM public.create_notification(
            NEW.user_id, 'Ride booked',
            'You booked a ride from ' || ride_record.start_location || ' to ' || ride_record.end_location || '.',
            'ride', ride_link);
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status = 'joined' THEN
        PERFORM public.create_notification(
            ride_record.user_id, 'Passenger cancelled',
            passenger_name || ' cancelled their booking on your ride from ' || ride_record.start_location || ' to ' || ride_record.end_location || '.',
            'ride', ride_link);
    END IF;

    RETURN NEW;
END;
$$;

-- New chat message → open that ride's chat.
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
        'ride',
        '/inbox?rideId=' || NEW.ride_id || '&peerId=' || NEW.sender_id
    );
    RETURN NEW;
END;
$$;

-- Ride cancelled / completed → open the ride detail.
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
    ride_link TEXT;
BEGIN
    IF NEW.status = OLD.status OR NEW.status NOT IN ('cancelled', 'completed') THEN
        RETURN NEW;
    END IF;

    ride_link := '/rides/detail/' || NEW.id;

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
        PERFORM public.create_notification(participant.user_id, status_title, status_body, 'ride', ride_link);
    END LOOP;

    RETURN NEW;
END;
$$;
