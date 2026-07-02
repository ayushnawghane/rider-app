-- Phase 2 · Trust foundation
-- Public, read-only access to a driver's rating summary and reviews.
--
-- Reviews live in `bookings` (driver_rating / driver_review), which is
-- owner-only under RLS ("Users manage own bookings"). To show a public driver
-- profile we expose just the safe, aggregate/review fields through SECURITY
-- DEFINER functions rather than opening up the whole table.

-- Average rating + number of ratings a driver has received.
CREATE OR REPLACE FUNCTION public.get_driver_rating_summary(target_driver_id UUID)
RETURNS TABLE(avg_rating NUMERIC, review_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        ROUND(AVG(b.driver_rating)::numeric, 1) AS avg_rating,
        COUNT(b.driver_rating) AS review_count
    FROM bookings b
    JOIN rides r ON r.id = b.ride_id
    WHERE (r.user_id = target_driver_id OR r.driver_id = target_driver_id)
      AND b.driver_rating IS NOT NULL;
$$;

-- A driver's most recent reviews, with the reviewer's public identity.
CREATE OR REPLACE FUNCTION public.get_driver_reviews(target_driver_id UUID, max_rows INT DEFAULT 20)
RETURNS TABLE(
    id UUID,
    rating SMALLINT,
    review TEXT,
    created_at TIMESTAMPTZ,
    reviewer_name TEXT,
    reviewer_avatar TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        b.id,
        b.driver_rating,
        b.driver_review,
        COALESCE(b.completion_time, b.updated_at, b.created_at) AS created_at,
        COALESCE(NULLIF(TRIM(p.full_name), ''), 'Passenger') AS reviewer_name,
        p.avatar_url AS reviewer_avatar
    FROM bookings b
    JOIN rides r ON r.id = b.ride_id
    LEFT JOIN profiles p ON p.id = b.passenger_id
    WHERE (r.user_id = target_driver_id OR r.driver_id = target_driver_id)
      AND b.driver_rating IS NOT NULL
    ORDER BY COALESCE(b.completion_time, b.updated_at, b.created_at) DESC
    LIMIT GREATEST(1, LEAST(max_rows, 100));
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_rating_summary(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_driver_reviews(UUID, INT) TO authenticated, anon;
