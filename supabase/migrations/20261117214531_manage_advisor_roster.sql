BEGIN;

-- Resolve a single existing advisor by email without exposing the auth directory.
CREATE FUNCTION public.assign_advisor_roster(account_email text, roster_id integer DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    advisor_account uuid;
    advisor_name text;
    assigned_id integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
    ) THEN
        RAISE EXCEPTION 'Roster management is restricted to managers.' USING ERRCODE = '42501';
    END IF;

    SELECT profile.user_id, profile.display_name
    INTO advisor_account, advisor_name
    FROM auth.users AS account
    JOIN public.staff_profiles AS profile ON profile.user_id = account.id
    WHERE lower(account.email) = lower(btrim(account_email))
      AND profile.role = 'advisor';

    IF advisor_account IS NULL THEN
        RAISE EXCEPTION 'No advisor account matches that email.' USING ERRCODE = 'PT404';
    END IF;

    IF roster_id IS NULL THEN
        INSERT INTO public.advisor_roster (name, user_id)
        VALUES (advisor_name, advisor_account)
        RETURNING id INTO assigned_id;
    ELSE
        UPDATE public.advisor_roster
        SET user_id = advisor_account
        WHERE id = roster_id AND user_id IS NULL
        RETURNING id INTO assigned_id;

        IF assigned_id IS NULL THEN
            RAISE EXCEPTION 'That roster entry is no longer available for linking.' USING ERRCODE = 'PT409';
        END IF;
    END IF;

    RETURN assigned_id;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'The account or name is already on the roster.' USING ERRCODE = '23505';
END;
$$;

REVOKE ALL ON FUNCTION public.assign_advisor_roster(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_advisor_roster(text, integer) TO authenticated;

COMMIT;
