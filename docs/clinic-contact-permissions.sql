-- The existing managers_update_directory row policy limits these updates
-- to managers and owners. Keep the clinic ID and name outside this grant.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'clinic_contacts' AND c.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'clinic_contacts'
      AND policyname = 'managers_update_directory' AND cmd = 'UPDATE'
      AND qual IS NOT NULL AND with_check IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Expected manager-only clinic contact policy is missing';
  END IF;
END;
$$;

GRANT UPDATE (phone, address) ON public.clinic_contacts TO authenticated;

COMMIT;
