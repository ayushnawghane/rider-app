-- Enforce the monthly reward cap.
--
-- The deployed publish/join reward triggers inserted a FIXED number of points
-- directly (50 per publish, 30 per join) and never consulted
-- `award_capped_ride_reward`, so a user could earn unlimited points — there was
-- no monthly limit in practice. This re-points both triggers at
-- `award_capped_ride_reward`, which awards up to 50 points per ride event but
-- never more than 100 points/month across publish + join + complete.
--
-- Points AND level are handled by `award_capped_ride_reward`; the app already
-- maintains the `rides_published` / `rides_taken` counters, so these triggers
-- deliberately no longer touch profile stats (that also removes a
-- double-count where both the trigger and the app bumped the same counter).

-- Publish reward → capped
CREATE OR REPLACE FUNCTION public.award_publish_ride_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.award_capped_ride_reward(
        NEW.user_id,
        NEW.id,
        'publish_ride',
        FORMAT('Published a ride from %s to %s', NEW.start_location, NEW.end_location),
        jsonb_build_object('source', 'trigger', 'status', NEW.status),
        FORMAT('publish_ride:%s:%s', NEW.id, NEW.user_id)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_publish_ride_reward ON rides;
CREATE TRIGGER trigger_award_publish_ride_reward
    AFTER INSERT ON rides
    FOR EACH ROW EXECUTE FUNCTION public.award_publish_ride_reward();

-- Join reward → capped
CREATE OR REPLACE FUNCTION public.award_join_ride_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ride_record rides%ROWTYPE;
BEGIN
    IF NEW.status <> 'joined' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'joined' THEN
        RETURN NEW;
    END IF;

    SELECT * INTO ride_record FROM rides WHERE id = NEW.ride_id;
    IF ride_record.id IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM public.award_capped_ride_reward(
        NEW.user_id,
        NEW.ride_id,
        'join_ride',
        FORMAT('Joined a ride from %s to %s', ride_record.start_location, ride_record.end_location),
        jsonb_build_object('source', 'trigger', 'seats_booked', NEW.seats_booked),
        FORMAT('join_ride:%s:%s', NEW.ride_id, NEW.user_id)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_join_ride_reward ON ride_participants;
CREATE TRIGGER trigger_award_join_ride_reward
    AFTER INSERT OR UPDATE OF status ON ride_participants
    FOR EACH ROW EXECUTE FUNCTION public.award_join_ride_reward();
