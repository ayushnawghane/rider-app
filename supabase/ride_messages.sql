-- Transient ride messaging schema.
-- Run this after supabase/schema.sql and supabase/rewards_schema.sql.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS ride_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 1000),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_messages_ride_id ON ride_messages(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_messages_sender_id ON ride_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ride_messages_receiver_id ON ride_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_ride_messages_created_at ON ride_messages(created_at ASC);

ALTER TABLE ride_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ride participants see messages" ON ride_messages;

DROP POLICY IF EXISTS "Ride users can view ride messages" ON ride_messages;
CREATE POLICY "Ride users can view ride messages" ON ride_messages
    FOR SELECT USING (
        auth.uid() = sender_id
        OR auth.uid() = receiver_id
        OR EXISTS (
            SELECT 1
            FROM rides
            WHERE rides.id = ride_messages.ride_id
              AND (rides.user_id = auth.uid() OR rides.driver_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1
            FROM ride_participants
            WHERE ride_participants.ride_id = ride_messages.ride_id
              AND ride_participants.user_id = auth.uid()
              AND ride_participants.status = 'joined'
        )
    );

DROP POLICY IF EXISTS "Ride users can send ride messages" ON ride_messages;
CREATE POLICY "Ride users can send ride messages" ON ride_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND (
            EXISTS (
                SELECT 1
                FROM rides
                WHERE rides.id = ride_messages.ride_id
                  AND rides.status IN ('pending', 'active')
                  AND (rides.user_id = auth.uid() OR rides.driver_id = auth.uid())
            )
            OR EXISTS (
                SELECT 1
                FROM ride_participants
                WHERE ride_participants.ride_id = ride_messages.ride_id
                  AND ride_participants.user_id = auth.uid()
                  AND ride_participants.status = 'joined'
            )
        )
    );
