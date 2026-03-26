-- Migration: Create SEO, Marketing, Discounts, and Newsletter Tables

-- 1. Insert/Update SEO Settings into the existing `site_settings` table
INSERT INTO public.site_settings (key, value, description) VALUES
  ('seo_meta_title', 'FlySky Guitar - Nhạc cụ cao cấp & Studio chuyên nghiệp', 'Tiêu đề trang Web mặc định'),
  ('seo_meta_description', 'Khám phá thế giới nhạc cụ FlySky Guitar, chuyên cung cấp các dòng guitar gỗ thủ công, thiết bị phòng thu và dịch vụ thu âm chuyên nghiệp tại Việt Nam.', 'Mô tả trang Web mặc định (Meta Description)'),
  ('seo_meta_keywords', 'guitar, studio, wood guitar, flysky', 'Từ khóa SEO (Meta Keywords)'),
  ('seo_sitemap_url', '/sitemap.xml', 'Đường dẫn sơ đồ trang web (Sitemap URL)'),
  ('seo_gsc_id', '', 'ID Google Search Console'),
  ('seo_ga4_id', '', 'ID Google Analytics 4'),
  ('seo_fb_pixel_id', '', 'ID Facebook Pixel')
ON CONFLICT (key) DO NOTHING;

-- 2. Table for Email Campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ĐANG CHỜ', -- 'HOÀN THÀNH', 'ĐANG CHỜ', 'ĐANG GỬI'
    sent_at TIMESTAMP WITH TIME ZONE,
    open_rate NUMERIC(5,2) DEFAULT 0,
    click_rate NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed some email campaigns
INSERT INTO public.email_campaigns (title, status, sent_at, open_rate, click_rate) VALUES 
('BST Guitar Gỗ Mùa Thu', 'HOÀN THÀNH', timezone('utc'::text, now()) - interval '30 days', 24.8, 3.2),
('Ưu đãi phụ kiện Studio', 'HOÀN THÀNH', timezone('utc'::text, now()) - interval '40 days', 18.5, 1.9),
('Bản tin Giáng Sinh', 'ĐANG CHỜ', timezone('utc'::text, now()) + interval '10 days', 0, 0)
ON CONFLICT DO NOTHING;

-- 3. Table for Marketing Workflows
CREATE TABLE IF NOT EXISTS public.marketing_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed basic workflows
INSERT INTO public.marketing_workflows (title, description, icon, is_active) VALUES 
('Chuỗi chào mừng', 'Gửi khi khách hàng đăng ký tài khoản mới.', 'handshake', true),
('Giỏ hàng bỏ quên', 'Nhắc nhở khách hàng hoàn tất đơn hàng.', 'shopping_cart_checkout', true),
('Chúc mừng sinh nhật', 'Gửi ưu đãi đặc biệt vào ngày sinh nhật.', 'celebration', false)
ON CONFLICT DO NOTHING;

-- 4. Table for Newsletter Subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Đang hoạt động', -- 'Đang hoạt động', 'Đã hủy'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed some subscribers
INSERT INTO public.newsletter_subscribers (email, status, joined_at) VALUES 
('nguyen.van.a@demo.com', 'Đang hoạt động', timezone('utc'::text, now()) - interval '2 days'),
('tran.thi.b@demo.com', 'Đang hoạt động', timezone('utc'::text, now()) - interval '3 days'),
('le.c@demo.com', 'Đã hủy', timezone('utc'::text, now()) - interval '5 days')
ON CONFLICT DO NOTHING;

-- 5. Table for Discounts
CREATE TABLE IF NOT EXISTS public.discounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(50) DEFAULT 'percent', -- 'percent', 'fixed'
    discount_value NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Đang hoạt động', -- 'Đang hoạt động', 'Đã hết hạn', 'Bản nháp'
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    min_order_value NUMERIC(12,2) DEFAULT 0,
    usage_limit INTEGER DEFAULT 0, -- 0 means unlimited
    per_user_limit INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed some active discounts
INSERT INTO public.discounts (code, description, discount_type, discount_value, status, start_date, end_date, min_order_value, usage_limit, used_count) VALUES 
('GUITARNEW2026', 'Giảm cho khách hàng mới', 'percent', 20, 'Đang hoạt động', timezone('utc'::text, now()) - interval '30 days', timezone('utc'::text, now()) + interval '60 days', 0, 100, 85),
('WOODFEEL', 'Ưu đãi dòng Acoustic', 'fixed', 500000, 'Đang hoạt động', timezone('utc'::text, now()) - interval '10 days', timezone('utc'::text, now()) + interval '90 days', 2000000, 200, 42),
('VIPMEMBER', 'Dành riêng cho khách VIP', 'percent', 15, 'Đang hoạt động', timezone('utc'::text, now()) - interval '100 days', NULL, 0, 50, 12)
ON CONFLICT DO NOTHING;

-- 6. Table for Newsletter Templates
CREATE TABLE IF NOT EXISTS public.newsletter_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    content TEXT,
    type VARCHAR(50) DEFAULT 'custom', -- 'system', 'custom'
    icon VARCHAR(50) DEFAULT 'draft',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed templates
INSERT INTO public.newsletter_templates (name, subject, type, icon) VALUES 
('Khuyến mãi Thu', 'Ưu đãi tháng 10: Giảm 20% phụ kiện', 'custom', 'draft'),
('Chào mừng khách hàng', 'Chào mừng bạn đến với FlySky Guitar!', 'system', 'mail')
ON CONFLICT DO NOTHING;


-- Enable Row Level Security (RLS)
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_templates ENABLE ROW LEVEL SECURITY;

-- Simple Access Policies
CREATE POLICY "Enable all for email_campaigns" ON public.email_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for marketing_workflows" ON public.marketing_workflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for newsletter_subscribers" ON public.newsletter_subscribers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for discounts" ON public.discounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for newsletter_templates" ON public.newsletter_templates FOR ALL USING (true) WITH CHECK (true);
