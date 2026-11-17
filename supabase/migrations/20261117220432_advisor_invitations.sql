BEGIN;

CREATE TABLE public.advisor_invitations (
    request_id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'pending', 'accepted'))
);

ALTER TABLE public.advisor_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.advisor_invitations FROM PUBLIC, anon, authenticated;
GRANT SELECT (email, requested_at, status) ON public.advisor_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_invitations TO service_role;

CREATE POLICY "Managers can read advisor invitations"
    ON public.advisor_invitations FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE user_id = (SELECT auth.uid()) AND role IN ('manager', 'owner')
    ));

CREATE FUNCTION public.reserve_advisor_invitation(invite_id uuid, invite_email text, manager_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE user_id = manager_id AND role IN ('manager', 'owner')
    ) THEN
        RAISE EXCEPTION 'Only managers can invite advisors.' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (SELECT 1 FROM public.advisor_invitations WHERE email = invite_email) THEN
        RAISE EXCEPTION 'Invitation already exists.' USING ERRCODE = '23505';
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = invite_email) THEN
        RAISE EXCEPTION 'Account already exists.' USING ERRCODE = 'PT409';
    END IF;

    INSERT INTO public.advisor_invitations (request_id, email, invited_by)
    VALUES (invite_id, invite_email, manager_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_advisor_invitation(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_advisor_invitation(uuid, text, uuid) TO service_role;

-- The one-time request ID was generated on the server before calling Auth.
-- Bind it when Auth sets invited_at, matching the exact reserved email.
CREATE FUNCTION renue_private.bind_advisor_invitation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NEW.invited_at IS NOT NULL THEN
        UPDATE public.advisor_invitations
        SET user_id = NEW.id, status = 'pending'
        WHERE request_id::text = NEW.raw_user_meta_data ->> 'renue_advisor_invite'
          AND email = lower(NEW.email) AND status = 'sending';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER renue_bind_advisor_invitation
AFTER INSERT OR UPDATE OF invited_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION renue_private.bind_advisor_invitation();

-- The existing Auth setup trigger writes the advisor's staff profile after
-- confirmed email, password and first name. Preserve any already linked row.
CREATE FUNCTION renue_private.roster_invited_advisor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    roster_name text := NEW.display_name;
    suffix integer := 1;
BEGIN
    IF NEW.role <> 'advisor' THEN RETURN NEW; END IF;

    UPDATE public.advisor_invitations SET status = 'accepted'
    WHERE user_id = NEW.user_id AND status = 'pending';
    IF NOT FOUND THEN RETURN NEW; END IF;

    LOOP
        INSERT INTO public.advisor_roster (name, user_id)
        VALUES (roster_name, NEW.user_id) ON CONFLICT DO NOTHING;
        EXIT WHEN FOUND OR EXISTS (
            SELECT 1 FROM public.advisor_roster WHERE user_id = NEW.user_id
        );
        suffix := suffix + 1;
        roster_name := NEW.display_name || ' (' || suffix || ')';
    END LOOP;

    RETURN NEW;
END;
$$;

CREATE TRIGGER renue_roster_invited_advisor
AFTER INSERT OR UPDATE OF display_name ON public.staff_profiles
FOR EACH ROW EXECUTE FUNCTION renue_private.roster_invited_advisor();

REVOKE ALL ON FUNCTION renue_private.bind_advisor_invitation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION renue_private.roster_invited_advisor() FROM PUBLIC, anon, authenticated;

COMMIT;
