BEGIN;

CREATE FUNCTION public.list_staff_accounts()
RETURNS TABLE (user_id uuid, display_name text, email text, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_profiles AS caller
        WHERE caller.user_id = auth.uid() AND caller.role IN ('manager', 'owner')
    ) THEN
        RAISE EXCEPTION 'Manager access required.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT profile.user_id, profile.display_name, account.email::text, profile.role
    FROM public.staff_profiles AS profile
    JOIN auth.users AS account ON account.id = profile.user_id
    ORDER BY lower(profile.display_name), profile.user_id;
END;
$$;

CREATE FUNCTION public.change_staff_access(target_id uuid, expected_role text, new_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF target_id = auth.uid() OR NOT EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE user_id = auth.uid() AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Owner access required.' USING ERRCODE = '42501';
    END IF;
    IF new_role IS NULL OR new_role NOT IN ('advisor', 'manager') THEN
        RAISE EXCEPTION 'Invalid role.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.staff_profiles SET role = new_role
    WHERE user_id = target_id AND role = expected_role AND role <> 'owner';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'The account changed. Reload and try again.' USING ERRCODE = 'PT409';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.list_staff_accounts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_staff_access(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_staff_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_staff_access(uuid, text, text) TO authenticated;

COMMIT;
