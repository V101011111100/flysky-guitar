-- Fix RLS for public.reviews
-- Purpose: resolve Supabase warning about public table exposure (RLS disabled/misaligned)

BEGIN;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews FORCE ROW LEVEL SECURITY;

-- Optional hardening on grants (RLS still controls row access)
REVOKE ALL ON TABLE public.reviews FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;

-- Rebuild policies to a known-safe baseline
DROP POLICY IF EXISTS "Public reviews are viewable by everyone." ON public.reviews;
DROP POLICY IF EXISTS "Anyone can insert a review." ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can update reviews." ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can delete reviews." ON public.reviews;
DROP POLICY IF EXISTS "Public can read approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can create review" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated can update reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated can delete reviews" ON public.reviews;

-- Public can only see approved reviews; authenticated users can read all for moderation
CREATE POLICY "Public can read approved reviews"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (status = 'approved' OR auth.role() = 'authenticated');

-- Public/clients can submit reviews
CREATE POLICY "Anyone can create review"
ON public.reviews
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Moderation actions require authenticated session
CREATE POLICY "Authenticated can update reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');

COMMIT;
