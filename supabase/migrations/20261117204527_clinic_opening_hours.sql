BEGIN;

-- A weekly schedule is saved atomically. Days run Sunday through Saturday.
CREATE FUNCTION public.valid_clinic_weekly_hours(schedule jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE STRICT
SET search_path = ''
AS $$
DECLARE
    day jsonb;
BEGIN
    IF jsonb_typeof(schedule) <> 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(schedule) <> 7 THEN RETURN false; END IF;
    FOR day IN SELECT value FROM jsonb_array_elements(schedule) LOOP
        IF day = 'null'::jsonb THEN CONTINUE; END IF;
        IF jsonb_typeof(day) <> 'array' THEN RETURN false; END IF;
        IF jsonb_array_length(day) <> 2
            OR jsonb_typeof(day->0) IS DISTINCT FROM 'string'
            OR jsonb_typeof(day->1) IS DISTINCT FROM 'string'
            OR (day->>0) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
            OR (day->>1) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
            OR (day->>0) >= (day->>1)
        THEN RETURN false; END IF;
    END LOOP;
    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.valid_clinic_weekly_hours(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.valid_clinic_weekly_hours(jsonb) TO authenticated;

CREATE TABLE public.clinic_opening_hours (
    clinic_id text PRIMARY KEY REFERENCES public.clinic_contacts (clinic_id),
    schedule jsonb NOT NULL CHECK (public.valid_clinic_weekly_hours(schedule))
);

INSERT INTO public.clinic_opening_hours (clinic_id, schedule) VALUES
    ('NY', '[["10:00","18:30"],["12:00","20:30"],["09:30","20:00"],["12:00","20:30"],["09:30","20:30"],["09:00","15:00"],null]'),
    ('CHELSEA', '[["10:00","18:30"],["09:30","20:30"],null,["12:00","20:30"],["09:30","20:30"],null,null]'),
    ('NJ', '[["10:00","18:30"],["09:15","17:30"],["10:00","20:00"],["09:15","17:30"],["10:00","20:00"],["09:00","17:30"],null]'),
    ('FL', '[null,["08:30","16:30"],["09:00","17:00"],["08:30","16:30"],["09:00","17:00"],["08:30","16:30"],null]');

ALTER TABLE public.clinic_opening_hours ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinic_opening_hours FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.clinic_opening_hours TO authenticated;
GRANT UPDATE (schedule) ON public.clinic_opening_hours TO authenticated;

CREATE POLICY "Staff can read clinic opening hours"
    ON public.clinic_opening_hours FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE user_id = (SELECT auth.uid()) AND role IN ('advisor', 'manager', 'owner')
    ));

CREATE POLICY "Managers can update clinic opening hours"
    ON public.clinic_opening_hours FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE user_id = (SELECT auth.uid()) AND role IN ('manager', 'owner')
    ));

COMMIT;
