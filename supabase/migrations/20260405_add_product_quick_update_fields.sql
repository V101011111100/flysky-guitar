-- Add missing columns used by product quick update/edit-on-page
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS product_condition text NOT NULL DEFAULT 'new';
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS benefits text[];
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS highlight_features text[];

-- Keep existing status values safe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_product_condition_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_product_condition_check
      CHECK (product_condition IN ('new', 'used', 'like_new'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
