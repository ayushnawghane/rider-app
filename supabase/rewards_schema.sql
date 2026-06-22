-- RiderApp rewards and ride-join schema
-- Run this AFTER supabase/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Allow users to discover joinable rides while still seeing their own.
DROP POLICY IF EXISTS "Users can view joinable rides" ON rides;
CREATE POLICY "Users can view joinable rides" ON rides
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (
            auth.uid() = user_id
            OR status IN ('pending', 'active')
        )
    );

-- Track who joined which ride.
CREATE TABLE IF NOT EXISTS ride_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seats_booked INTEGER NOT NULL DEFAULT 1 CHECK (seats_booked > 0),
    status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (ride_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ride_participants_ride_id ON ride_participants(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_participants_user_id ON ride_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_participants_status ON ride_participants(status);

ALTER TABLE ride_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ride participants" ON ride_participants;
CREATE POLICY "Users can view ride participants" ON ride_participants
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1
            FROM rides
            WHERE rides.id = ride_participants.ride_id
              AND rides.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can join rides as themselves" ON ride_participants;
CREATE POLICY "Users can join rides as themselves" ON ride_participants
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1
            FROM rides
            WHERE rides.id = ride_participants.ride_id
              AND rides.user_id <> auth.uid()
              AND rides.status IN ('pending', 'active')
        )
    );

DROP POLICY IF EXISTS "Users can update own ride participation" ON ride_participants;
CREATE POLICY "Users can update own ride participation" ON ride_participants
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ride participation" ON ride_participants;
CREATE POLICY "Users can delete own ride participation" ON ride_participants
    FOR DELETE USING (auth.uid() = user_id);

-- Points ledger.
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
    points INTEGER NOT NULL CHECK (points > 0),
    action TEXT NOT NULL CHECK (
      action IN (
        'publish_ride',
        'join_ride',
        'complete_ride',
        'weekly_streak',
        'referral',
        'five_star_rating'
      )
    ),
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    event_key TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_action ON rewards(action);
CREATE INDEX IF NOT EXISTS idx_rewards_created_at ON rewards(created_at DESC);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rewards" ON rewards;
CREATE POLICY "Users can view own rewards" ON rewards
    FOR SELECT USING (auth.uid() = user_id);

-- Shared capped ride reward helper.
CREATE OR REPLACE FUNCTION public.award_capped_ride_reward(
    reward_user_id UUID,
    reward_ride_id UUID,
    reward_action TEXT,
    reward_description TEXT,
    reward_metadata JSONB,
    reward_event_key TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    monthly_points INTEGER := 0;
    award_points INTEGER := 0;
    new_total_points INTEGER := 0;
    new_level INTEGER := 1;
BEGIN
    SELECT COALESCE(SUM(points), 0)
    INTO monthly_points
    FROM rewards
    WHERE user_id = reward_user_id
      AND action IN ('publish_ride', 'join_ride', 'complete_ride')
      AND created_at >= date_trunc('month', timezone('UTC', now()))
      AND created_at < date_trunc('month', timezone('UTC', now())) + interval '1 month';

    award_points := LEAST(50, GREATEST(0, 100 - monthly_points));
    IF award_points <= 0 THEN
        RETURN 0;
    END IF;

    INSERT INTO rewards (
        user_id,
        ride_id,
        points,
        action,
        description,
        metadata,
        event_key
    )
    VALUES (
        reward_user_id,
        reward_ride_id,
        award_points,
        reward_action,
        reward_description,
        reward_metadata || jsonb_build_object(
            'monthly_points_before_award', monthly_points,
            'monthly_cap', 100
        ),
        reward_event_key
    )
    ON CONFLICT (event_key) DO NOTHING
    RETURNING points INTO award_points;

    IF award_points IS NULL OR award_points <= 0 THEN
        RETURN 0;
    END IF;

    UPDATE profiles
    SET
        total_points = COALESCE(total_points, 0) + award_points,
        level = GREATEST(COALESCE(level, 1), FLOOR((COALESCE(total_points, 0) + award_points) / 500) + 1),
        updated_at = NOW()
    WHERE id = reward_user_id
    RETURNING total_points, level INTO new_total_points, new_level;

    RETURN award_points;
END;
$$;

-- Ensure updated_at works for ride_participants.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ride_participants_updated_at ON ride_participants;
CREATE TRIGGER update_ride_participants_updated_at
    BEFORE UPDATE ON ride_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-award reward points for publishing rides.
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
        jsonb_build_object(
            'source', 'trigger',
            'status', NEW.status
        ),
        FORMAT('publish_ride:%s:%s', NEW.id, NEW.user_id)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_publish_ride_reward ON rides;
CREATE TRIGGER trigger_award_publish_ride_reward
    AFTER INSERT ON rides
    FOR EACH ROW EXECUTE FUNCTION public.award_publish_ride_reward();

-- Auto-award reward points for joining rides.
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

    SELECT *
    INTO ride_record
    FROM rides
    WHERE id = NEW.ride_id;

    IF ride_record.id IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM public.award_capped_ride_reward(
        NEW.user_id,
        NEW.ride_id,
        'join_ride',
        FORMAT('Joined a ride from %s to %s', ride_record.start_location, ride_record.end_location),
        jsonb_build_object(
            'source', 'trigger',
            'seats_booked', NEW.seats_booked
        ),
        FORMAT('join_ride:%s:%s', NEW.ride_id, NEW.user_id)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_join_ride_reward ON ride_participants;
CREATE TRIGGER trigger_award_join_ride_reward
    AFTER INSERT OR UPDATE OF status ON ride_participants
    FOR EACH ROW EXECUTE FUNCTION public.award_join_ride_reward();
