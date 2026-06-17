-- Security hardening for RiderApp.
-- Run this after the base schema and rewards schema.

-- Users may update only self-managed profile columns. Admin/trust columns such
-- as role, kyc_status, is_blocked, counters, ratings, and referral data must be
-- changed only by service-role code or dedicated security-definer functions.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own editable profile fields" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

REVOKE UPDATE ON public.profiles FROM authenticated;

DO $$
DECLARE
    editable_columns text[] := ARRAY[
        'email',
        'full_name',
        'first_name',
        'last_name',
        'phone',
        'avatar_url',
        'language',
        'notification_preferences',
        'vehicle_details',
        'updated_at'
    ];
    grant_columns text;
BEGIN
    SELECT string_agg(quote_ident(column_name), ', ')
    INTO grant_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = ANY(editable_columns);

    IF grant_columns IS NOT NULL THEN
        EXECUTE format('GRANT UPDATE (%s) ON public.profiles TO authenticated', grant_columns);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.submit_kyc_document(document_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id uuid := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF document_path IS NULL
       OR document_path = ''
       OR split_part(document_path, '/', 1) <> caller_id::text THEN
        RAISE EXCEPTION 'Invalid KYC document path';
    END IF;

    UPDATE public.profiles
    SET kyc_document_url = document_path,
        kyc_status = 'pending',
        updated_at = now()
    WHERE id = caller_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_kyc_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_kyc_document(text) TO authenticated;

-- Storage buckets and policies. KYC documents are private; profile avatars may
-- remain public because they are displayed in the rider UI.
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users can upload own KYC documents" ON storage.objects;
CREATE POLICY "Users can upload own KYC documents" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'kyc-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can read own KYC documents" ON storage.objects;
CREATE POLICY "Users can read own KYC documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'kyc-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can replace own KYC documents" ON storage.objects;
CREATE POLICY "Users can replace own KYC documents" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'kyc-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'kyc-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can upload own profile avatars" ON storage.objects;
CREATE POLICY "Users can upload own profile avatars" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'profile-avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can replace own profile avatars" ON storage.objects;
CREATE POLICY "Users can replace own profile avatars" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'profile-avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'profile-avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Public can read profile avatars" ON storage.objects;
CREATE POLICY "Public can read profile avatars" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'profile-avatars');
