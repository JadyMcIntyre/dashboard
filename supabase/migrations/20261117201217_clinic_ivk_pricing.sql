BEGIN;

CREATE TABLE public.clinic_treatment_prices (
    clinic_id text NOT NULL REFERENCES public.clinic_contacts (clinic_id),
    treatment text NOT NULL,
    standard_price numeric(10,2) CHECK (standard_price > 0),
    promotional_price numeric(10,2) CHECK (promotional_price > 0),
    offer_price numeric(10,2) CHECK (offer_price > 0),
    PRIMARY KEY (clinic_id, treatment),
    CHECK (standard_price IS NOT NULL OR (promotional_price IS NULL AND offer_price IS NULL))
);

INSERT INTO public.clinic_treatment_prices
    (clinic_id, treatment, standard_price, promotional_price, offer_price)
VALUES
    ('NY', 'ivk', 500, 450, NULL),
    ('CHELSEA', 'ivk', 500, 450, 400),
    ('NJ', 'ivk', 525, 475, NULL),
    ('FL', 'ivk', NULL, NULL, NULL);

ALTER TABLE public.clinic_treatment_prices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinic_treatment_prices FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.clinic_treatment_prices TO authenticated;
GRANT UPDATE (standard_price, promotional_price, offer_price)
    ON public.clinic_treatment_prices TO authenticated;

CREATE POLICY "Staff can read clinic treatment prices"
    ON public.clinic_treatment_prices FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE user_id = (SELECT auth.uid()) AND role IN ('advisor', 'manager', 'owner')
    ));

CREATE POLICY "Managers can update clinic treatment prices"
    ON public.clinic_treatment_prices FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE user_id = (SELECT auth.uid()) AND role IN ('manager', 'owner')
    ));

COMMIT;
