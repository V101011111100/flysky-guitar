-- ============================================================
-- FIX RLS - Kiểm tra và vá toàn bộ bảng trong Flysky Guitar
-- Chạy file này trong Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 1. TẠO BẢNG customers NẾU CHƯA CÓ + BẬT RLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  display_name TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated can manage customers" ON public.customers;

-- Admin đọc được toàn bộ danh sách khách
CREATE POLICY "Authenticated can read customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (true);

-- Admin có thể upsert / xóa khách
CREATE POLICY "Authenticated can manage customers"
  ON public.customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 2. TẠO BẢNG activity_logs NẾU CHƯA CÓ + BẬT RLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  action_type TEXT NOT NULL,
  action_text TEXT NOT NULL,
  module_name TEXT,
  ip_address TEXT DEFAULT 'unknown',
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON public.activity_logs;

-- Admin xem log
CREATE POLICY "Authenticated can read activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (true);

-- Server-side API insert log (anon + authenticated)
CREATE POLICY "Anyone can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);


-- ============================================================
-- 3. FIX: email_campaigns — giới hạn write chỉ cho authenticated
-- ============================================================
DROP POLICY IF EXISTS "Enable all for email_campaigns" ON public.email_campaigns;

CREATE POLICY "Public can read email_campaigns"
  ON public.email_campaigns FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage email_campaigns"
  ON public.email_campaigns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 4. FIX: marketing_workflows — giới hạn write chỉ cho authenticated
-- ============================================================
DROP POLICY IF EXISTS "Enable all for marketing_workflows" ON public.marketing_workflows;

CREATE POLICY "Public can read marketing_workflows"
  ON public.marketing_workflows FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage marketing_workflows"
  ON public.marketing_workflows FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 5. FIX: newsletter_subscribers — giới hạn write chỉ cho authenticated
-- ============================================================
DROP POLICY IF EXISTS "Enable all for newsletter_subscribers" ON public.newsletter_subscribers;

CREATE POLICY "Public can read newsletter_subscribers"
  ON public.newsletter_subscribers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage newsletter_subscribers"
  ON public.newsletter_subscribers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 6. FIX: discounts — public chỉ được đọc, write cần authenticated
-- ============================================================
DROP POLICY IF EXISTS "Enable all for discounts" ON public.discounts;

CREATE POLICY "Public can read active discounts"
  ON public.discounts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage discounts"
  ON public.discounts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 7. FIX: newsletter_templates — giới hạn write chỉ cho authenticated
-- ============================================================
DROP POLICY IF EXISTS "Enable all for newsletter_templates" ON public.newsletter_templates;

CREATE POLICY "Public can read newsletter_templates"
  ON public.newsletter_templates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage newsletter_templates"
  ON public.newsletter_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 8. FIX: print_templates — admin ALL phải require authenticated
-- ============================================================
DROP POLICY IF EXISTS "Cho phép admin chỉnh sửa templates" ON public.print_templates;

CREATE POLICY "Authenticated can manage print_templates"
  ON public.print_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 9. FIX: user_sessions — xóa policy dư thừa, giữ lại ALL
-- ============================================================
DROP POLICY IF EXISTS "Users can read their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;
-- Chỉ giữ lại: "Users can manage their own sessions" FOR ALL USING (auth.uid() = user_id)


-- ============================================================
-- 10. KIỂM TRA KẾT QUẢ — Chạy query này sau khi chạy xong phần trên
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
