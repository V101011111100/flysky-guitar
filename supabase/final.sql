-- ============================================================
-- FlySky Guitar - FINAL DATABASE SCHEMA (CLEAN / NO SEED DATA)
-- Purpose: deploy to a brand-new Supabase/Postgres database
-- Note: this file intentionally DOES NOT insert demo/sample data.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- ============================================================
-- SHARED FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_top_wood boolean DEFAULT false,
  is_body_wood boolean DEFAULT false,
  is_neck_wood boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.discounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code varchar(50) NOT NULL UNIQUE,
  description text,
  discount_type varchar(50) DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(10,2) NOT NULL,
  status varchar(50) DEFAULT 'Đang hoạt động',
  start_date timestamptz,
  end_date timestamptz,
  min_order_value numeric(12,2) DEFAULT 0,
  usage_limit integer DEFAULT 0,
  per_user_limit integer DEFAULT 1,
  used_count integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  sku text UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subtitle text,
  description text,
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  gallery_images text[] DEFAULT '{}'::text[],
  video_url text,
  benefits text[],
  highlight_features text[],
  is_featured boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'draft', 'out_of_stock')),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  product_condition text NOT NULL DEFAULT 'new' CHECK (product_condition IN ('new', 'used', 'like_new')),
  spec_top text,
  spec_body text,
  spec_neck text,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text,
  description text,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL UNIQUE,
  display_name text,
  note text,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  source text DEFAULT 'online' CHECK (source IN ('online', 'pos')),
  staff_id uuid REFERENCES auth.users(id),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  shipping_address text,
  note text,
  payment_method text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  shipping_fee numeric DEFAULT 0,
  discount_id uuid REFERENCES public.discounts(id) ON DELETE SET NULL,
  discount_code text,
  discount_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  price_at_time numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  subject text,
  message text NOT NULL,
  status text DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved')),
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  reviewer_name varchar(255),
  reviewer_contact varchar(255),
  status varchar(50) DEFAULT 'pending',
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  cover_image text,
  category text NOT NULL DEFAULT 'Kiến thức',
  tags text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_name text DEFAULT 'FlySky Guitar',
  seo_title text,
  seo_desc text,
  view_count integer DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  user_name text,
  user_role text,
  action_type text NOT NULL,
  action_text text NOT NULL,
  module_name text,
  ip_address text DEFAULT 'unknown',
  details jsonb,
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  refresh_token text,
  device_name text,
  device_type text,
  browser text,
  ip_address text,
  location text,
  user_agent text,
  is_active boolean DEFAULT true,
  last_activity timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW(),
  expires_at timestamptz DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- ============================================================
-- MARKETING / CONTENT / TEMPLATE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title varchar(255) NOT NULL,
  status varchar(50) DEFAULT 'ĐANG CHỜ',
  sent_at timestamptz,
  open_rate numeric(5,2) DEFAULT 0,
  click_rate numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketing_workflows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title varchar(255) NOT NULL,
  description text,
  icon varchar(50),
  is_active boolean DEFAULT false,
  workflow_key varchar(100),
  trigger_event varchar(100),
  email_subject text,
  email_body text,
  trigger_count integer DEFAULT 0,
  last_triggered_at timestamptz,
  last_status varchar(120) DEFAULT 'never',
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email varchar(255) NOT NULL UNIQUE,
  status varchar(50) DEFAULT 'Đang hoạt động',
  joined_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.newsletter_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(255) NOT NULL,
  subject varchar(255),
  content text,
  type varchar(50) DEFAULT 'custom',
  icon varchar(50) DEFAULT 'draft',
  updated_at timestamptz DEFAULT NOW() NOT NULL,
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.print_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  is_active boolean DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

-- ============================================================
-- EMAIL / SHIPPING / PAYMENT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL UNIQUE CHECK (provider IN ('smtp', 'gmail', 'sendgrid', 'mailgun', 'resend')),
  enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key text NOT NULL UNIQUE,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  variables jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient text NOT NULL,
  subject text NOT NULL,
  template_key text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  provider text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.shipping_providers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_code text NOT NULL UNIQUE CHECK (provider_code IN ('ghtk', 'ghn', 'viettel_post', 'vnpost', 'jnt', 'self_delivery')),
  provider_name text NOT NULL,
  enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_code text NOT NULL REFERENCES public.shipping_providers(provider_code) ON DELETE CASCADE,
  from_province text,
  to_province text,
  weight_from numeric DEFAULT 0,
  weight_to numeric,
  base_fee numeric NOT NULL DEFAULT 0,
  per_kg_fee numeric DEFAULT 0,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.shipping_trackings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  provider_code text NOT NULL,
  tracking_number text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')),
  current_location text,
  estimated_delivery timestamptz,
  actual_delivery timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL UNIQUE CHECK (provider IN ('bank_transfer', 'momo', 'vietqr', 'stripe', 'cash')),
  enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  transaction_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'VND',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active_last_activity ON public.user_sessions(user_id, is_active, last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON public.blog_posts (status);
CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON public.blog_posts (category);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_provider ON public.shipping_rates(provider_code);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_provinces ON public.shipping_rates(from_province, to_province);
CREATE INDEX IF NOT EXISTS idx_shipping_trackings_order ON public.shipping_trackings(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_trackings_tracking_number ON public.shipping_trackings(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipping_trackings_status ON public.shipping_trackings(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON public.payment_transactions(provider);

-- ============================================================
-- BUSINESS FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_single_active_template()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.print_templates
    SET is_active = false
    WHERE type = NEW.type AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS single_active_template ON public.print_templates;
CREATE TRIGGER single_active_template
  BEFORE INSERT OR UPDATE ON public.print_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_active_template();

CREATE OR REPLACE FUNCTION public.deduct_inventory()
RETURNS trigger SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_inventory ON public.order_items;
CREATE TRIGGER trigger_deduct_inventory
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory();

CREATE OR REPLACE FUNCTION public.restore_inventory_on_cancel()
RETURNS trigger SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE public.products p
    SET stock_quantity = p.stock_quantity + oi.quantity,
        updated_at = NOW()
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND p.id = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_restore_inventory ON public.orders;
CREATE TRIGGER trigger_restore_inventory
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_cancel();

CREATE OR REPLACE FUNCTION public.increment_discount_usage()
RETURNS trigger AS $$
BEGIN
  IF NEW.discount_id IS NOT NULL THEN
    UPDATE public.discounts
    SET used_count = used_count + 1
    WHERE id = NEW.discount_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_discount ON public.orders;
CREATE TRIGGER trigger_increment_discount
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_discount_usage();

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions(retention_days integer DEFAULT 14)
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < NOW()
     OR (is_active = false AND last_activity < NOW() - make_interval(days => retention_days));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_shipping_fee(
  p_provider_code text,
  p_from_province text,
  p_to_province text,
  p_weight numeric
)
RETURNS numeric AS $$
DECLARE
  v_rate RECORD;
  v_fee numeric := 0;
BEGIN
  SELECT * INTO v_rate
  FROM public.shipping_rates
  WHERE provider_code = p_provider_code
    AND enabled = true
    AND (from_province IS NULL OR from_province = p_from_province)
    AND (to_province IS NULL OR to_province = p_to_province)
    AND weight_from <= p_weight
    AND (weight_to IS NULL OR weight_to >= p_weight)
  ORDER BY
    CASE WHEN from_province IS NOT NULL THEN 1 ELSE 2 END,
    CASE WHEN to_province IS NOT NULL THEN 1 ELSE 2 END
  LIMIT 1;

  IF v_rate IS NOT NULL THEN
    v_fee := v_rate.base_fee + (GREATEST(p_weight - v_rate.weight_from, 0) * v_rate.per_kg_fee);
  END IF;

  RETURN v_fee;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.log_email(
  p_recipient text,
  p_subject text,
  p_template_key text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_status text DEFAULT 'pending',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.email_logs (recipient, subject, template_key, provider, status, metadata)
  VALUES (p_recipient, p_subject, p_template_key, p_provider, p_status, p_metadata)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- updated_at triggers
DROP TRIGGER IF EXISTS handle_updated_at_products ON public.products;
CREATE TRIGGER handle_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_site_settings ON public.site_settings;
CREATE TRIGGER handle_updated_at_site_settings
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_customers ON public.customers;
CREATE TRIGGER handle_updated_at_customers
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_orders ON public.orders;
CREATE TRIGGER handle_updated_at_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_print_templates ON public.print_templates;
CREATE TRIGGER handle_updated_at_print_templates
  BEFORE UPDATE ON public.print_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_email_settings ON public.email_settings;
CREATE TRIGGER handle_updated_at_email_settings
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_email_templates ON public.email_templates;
CREATE TRIGGER handle_updated_at_email_templates
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_shipping_providers ON public.shipping_providers;
CREATE TRIGGER handle_updated_at_shipping_providers
  BEFORE UPDATE ON public.shipping_providers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_shipping_rates ON public.shipping_rates;
CREATE TRIGGER handle_updated_at_shipping_rates
  BEFORE UPDATE ON public.shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_shipping_trackings ON public.shipping_trackings;
CREATE TRIGGER handle_updated_at_shipping_trackings
  BEFORE UPDATE ON public.shipping_trackings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_payment_settings ON public.payment_settings;
CREATE TRIGGER handle_updated_at_payment_settings
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_payment_transactions ON public.payment_transactions;
CREATE TRIGGER handle_updated_at_payment_transactions
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_push_subscriptions ON public.push_subscriptions;
CREATE TRIGGER handle_updated_at_push_subscriptions
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_trackings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- public read / admin manage: categories, products, site settings
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
CREATE POLICY "Public can read categories"
  ON public.categories FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage categories" ON public.categories;
CREATE POLICY "Authenticated can manage categories"
  ON public.categories FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read products" ON public.products;
CREATE POLICY "Public can read products"
  ON public.products FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage products" ON public.products;
CREATE POLICY "Authenticated can manage products"
  ON public.products FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings"
  ON public.site_settings FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage site settings" ON public.site_settings;
CREATE POLICY "Authenticated can manage site settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- customers / activity logs
DROP POLICY IF EXISTS "Authenticated can read customers" ON public.customers;
CREATE POLICY "Authenticated can read customers"
  ON public.customers FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage customers" ON public.customers;
CREATE POLICY "Authenticated can manage customers"
  ON public.customers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated can read activity logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert activity logs" ON public.activity_logs;
CREATE POLICY "Anyone can insert activity logs"
  ON public.activity_logs FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- orders / order items / contact
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders"
  ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage orders" ON public.orders;
CREATE POLICY "Authenticated can manage orders"
  ON public.orders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
CREATE POLICY "Public can insert order items"
  ON public.order_items FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage order items" ON public.order_items;
CREATE POLICY "Authenticated can manage order items"
  ON public.order_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert contact messages" ON public.contact_messages;
CREATE POLICY "Public can insert contact messages"
  ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage contact messages" ON public.contact_messages;
CREATE POLICY "Authenticated can manage contact messages"
  ON public.contact_messages FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert contact submissions" ON public.contact_submissions;
CREATE POLICY "Public can insert contact submissions"
  ON public.contact_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage contact submissions" ON public.contact_submissions;
CREATE POLICY "Authenticated can manage contact submissions"
  ON public.contact_submissions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- reviews
DROP POLICY IF EXISTS "Public can read approved reviews" ON public.reviews;
CREATE POLICY "Public can read approved reviews"
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can create review" ON public.reviews;
CREATE POLICY "Anyone can create review"
  ON public.reviews FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update reviews" ON public.reviews;
CREATE POLICY "Authenticated can update reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can delete reviews" ON public.reviews;
CREATE POLICY "Authenticated can delete reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (auth.role() = 'authenticated');

-- blog posts
DROP POLICY IF EXISTS "Public can read published posts" ON public.blog_posts;
CREATE POLICY "Public can read published posts"
  ON public.blog_posts FOR SELECT TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "Authenticated can read all posts" ON public.blog_posts;
CREATE POLICY "Authenticated can read all posts"
  ON public.blog_posts FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can create posts" ON public.blog_posts;
CREATE POLICY "Authenticated can create posts"
  ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update posts" ON public.blog_posts;
CREATE POLICY "Authenticated can update posts"
  ON public.blog_posts FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete posts" ON public.blog_posts;
CREATE POLICY "Authenticated can delete posts"
  ON public.blog_posts FOR DELETE TO authenticated
  USING (true);

-- newsletter / discount / campaign / marketing / templates
DROP POLICY IF EXISTS "Enable all for email_campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Public can read email campaigns" ON public.email_campaigns;
CREATE POLICY "Public can read email campaigns"
  ON public.email_campaigns FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage email campaigns" ON public.email_campaigns;
CREATE POLICY "Authenticated can manage email campaigns"
  ON public.email_campaigns FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for marketing_workflows" ON public.marketing_workflows;
DROP POLICY IF EXISTS "Public can read marketing workflows" ON public.marketing_workflows;
CREATE POLICY "Public can read marketing workflows"
  ON public.marketing_workflows FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage marketing workflows" ON public.marketing_workflows;
CREATE POLICY "Authenticated can manage marketing workflows"
  ON public.marketing_workflows FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for newsletter_subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Authenticated can manage newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Authenticated can manage newsletter subscribers"
  ON public.newsletter_subscribers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for discounts" ON public.discounts;
DROP POLICY IF EXISTS "Public can read active discounts" ON public.discounts;
CREATE POLICY "Public can read active discounts"
  ON public.discounts FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage discounts" ON public.discounts;
CREATE POLICY "Authenticated can manage discounts"
  ON public.discounts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for newsletter_templates" ON public.newsletter_templates;
DROP POLICY IF EXISTS "Public can read newsletter templates" ON public.newsletter_templates;
CREATE POLICY "Public can read newsletter templates"
  ON public.newsletter_templates FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage newsletter templates" ON public.newsletter_templates;
CREATE POLICY "Authenticated can manage newsletter templates"
  ON public.newsletter_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép tất cả đọc templates" ON public.print_templates;
DROP POLICY IF EXISTS "Public can read print templates" ON public.print_templates;
CREATE POLICY "Public can read print templates"
  ON public.print_templates FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Cho phép admin chỉnh sửa templates" ON public.print_templates;
DROP POLICY IF EXISTS "Authenticated can manage print templates" ON public.print_templates;
CREATE POLICY "Authenticated can manage print templates"
  ON public.print_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- user sessions / push subscriptions
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage their own sessions"
  ON public.user_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their own subscriptions"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert their own subscriptions"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update their own subscriptions"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own subscriptions"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- email / shipping / payment
DROP POLICY IF EXISTS "Authenticated can manage email settings" ON public.email_settings;
CREATE POLICY "Authenticated can manage email settings"
  ON public.email_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read email templates" ON public.email_templates;
CREATE POLICY "Public can read email templates"
  ON public.email_templates FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage email templates" ON public.email_templates;
CREATE POLICY "Authenticated can manage email templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read email logs" ON public.email_logs;
CREATE POLICY "Authenticated can read email logs"
  ON public.email_logs FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert email logs" ON public.email_logs;
CREATE POLICY "Anyone can insert email logs"
  ON public.email_logs FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read enabled shipping providers" ON public.shipping_providers;
CREATE POLICY "Anyone can read enabled shipping providers"
  ON public.shipping_providers FOR SELECT TO anon, authenticated
  USING (enabled = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can manage shipping providers" ON public.shipping_providers;
CREATE POLICY "Authenticated can manage shipping providers"
  ON public.shipping_providers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read enabled shipping rates" ON public.shipping_rates;
CREATE POLICY "Anyone can read enabled shipping rates"
  ON public.shipping_rates FOR SELECT TO anon, authenticated
  USING (enabled = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can manage shipping rates" ON public.shipping_rates;
CREATE POLICY "Authenticated can manage shipping rates"
  ON public.shipping_rates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read shipping trackings" ON public.shipping_trackings;
CREATE POLICY "Anyone can read shipping trackings"
  ON public.shipping_trackings FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage shipping trackings" ON public.shipping_trackings;
CREATE POLICY "Authenticated can manage shipping trackings"
  ON public.shipping_trackings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage payment settings" ON public.payment_settings;
CREATE POLICY "Authenticated can manage payment settings"
  ON public.payment_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert payment transactions" ON public.payment_transactions;
CREATE POLICY "Anyone can insert payment transactions"
  ON public.payment_transactions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read payment transactions" ON public.payment_transactions;
CREATE POLICY "Authenticated can read payment transactions"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (true);

COMMENT ON TABLE public.push_subscriptions IS 'Stores web push notification subscriptions for users';

NOTIFY pgrst, 'reload schema';
COMMIT;
