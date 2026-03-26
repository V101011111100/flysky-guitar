-- Create blog_posts table for FlySky Guitar blog system
-- Supports: title, slug, content (HTML/rich text), excerpt, featured image, category, tags, status, author, SEO fields

BEGIN;

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text NOT NULL,
  slug         text NOT NULL UNIQUE,
  excerpt      text,
  content      text,                          -- HTML content from rich text editor
  cover_image  text,                          -- URL of cover image
  category     text NOT NULL DEFAULT 'Kiến thức', -- e.g. Kiến thức, Bảo dưỡng, Review, Thiết bị, Tin tức
  tags         text[] DEFAULT '{}',
  status       text NOT NULL DEFAULT 'draft'  -- draft | published
               CHECK (status IN ('draft', 'published')),
  author_name  text DEFAULT 'FlySky Guitar',
  seo_title    text,
  seo_desc     text,
  view_count   integer DEFAULT 0,
  published_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.blog_posts FROM PUBLIC;
GRANT SELECT                              ON TABLE public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE      ON TABLE public.blog_posts TO authenticated;
GRANT ALL                                 ON TABLE public.blog_posts TO service_role;

-- Public can only see published posts
CREATE POLICY "Public can read published posts"
ON public.blog_posts FOR SELECT
TO anon
USING (status = 'published');

-- Authenticated (admin) can see all posts
CREATE POLICY "Authenticated can read all posts"
ON public.blog_posts FOR SELECT
TO authenticated
USING (true);

-- Authenticated (admin) can create posts
CREATE POLICY "Authenticated can create posts"
ON public.blog_posts FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated (admin) can update posts
CREATE POLICY "Authenticated can update posts"
ON public.blog_posts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Authenticated (admin) can delete posts
CREATE POLICY "Authenticated can delete posts"
ON public.blog_posts FOR DELETE
TO authenticated
USING (true);

-- ── Index for performance ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx     ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx   ON public.blog_posts (status);
CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON public.blog_posts (category);

COMMIT;
