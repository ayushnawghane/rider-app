CREATE TABLE IF NOT EXISTS public.phone_otp_requests (
    phone TEXT PRIMARY KEY,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    request_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.phone_otp_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_phone_otp_requests_expires_at
    ON public.phone_otp_requests (expires_at);
