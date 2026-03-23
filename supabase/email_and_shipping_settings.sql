-- ============================================
-- EMAIL SETTINGS
-- ============================================

-- Email Configuration Table
CREATE TABLE IF NOT EXISTS email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE CHECK (provider IN ('smtp', 'gmail', 'sendgrid', 'mailgun', 'resend')),
  enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  variables jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  template_key text,
  status text CHECK (status IN ('pending', 'sent', 'failed', 'bounced')) DEFAULT 'pending',
  provider text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- SHIPPING SETTINGS
-- ============================================

-- Shipping Providers Table
CREATE TABLE IF NOT EXISTS shipping_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL UNIQUE CHECK (provider_code IN ('ghtk', 'ghn', 'viettel_post', 'vnpost', 'jnt', 'self_delivery')),
  provider_name text NOT NULL,
  enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Shipping Rates Table (for custom pricing)
CREATE TABLE IF NOT EXISTS shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL REFERENCES shipping_providers(provider_code) ON DELETE CASCADE,
  from_province text,
  to_province text,
  weight_from numeric DEFAULT 0,
  weight_to numeric,
  base_fee numeric NOT NULL DEFAULT 0,
  per_kg_fee numeric DEFAULT 0,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Shipping Tracking Table
CREATE TABLE IF NOT EXISTS shipping_trackings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  provider_code text NOT NULL,
  tracking_number text NOT NULL,
  status text CHECK (status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')) DEFAULT 'pending',
  current_location text,
  estimated_delivery timestamp with time zone,
  actual_delivery timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shipping_rates_provider ON shipping_rates(provider_code);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_provinces ON shipping_rates(from_province, to_province);

CREATE INDEX IF NOT EXISTS idx_shipping_trackings_order ON shipping_trackings(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_trackings_tracking_number ON shipping_trackings(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipping_trackings_status ON shipping_trackings(status);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default email providers
INSERT INTO email_settings (provider, enabled, config) VALUES
  ('smtp', false, '{
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "",
      "pass": ""
    },
    "from_email": "",
    "from_name": "FlySky Guitar"
  }'::jsonb),
  ('gmail', false, '{
    "client_id": "",
    "client_secret": "",
    "refresh_token": "",
    "from_email": "",
    "from_name": "FlySky Guitar"
  }'::jsonb),
  ('sendgrid', false, '{
    "api_key": "",
    "from_email": "",
    "from_name": "FlySky Guitar"
  }'::jsonb),
  ('resend', false, '{
    "api_key": "",
    "from_email": "",
    "from_name": "FlySky Guitar"
  }'::jsonb)
ON CONFLICT (provider) DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (template_key, subject, body_html, body_text, variables) VALUES
  ('order_confirmation', 
   'Xác nhận đơn hàng #{{order_number}}',
   '<h1>Cảm ơn bạn đã đặt hàng!</h1><p>Đơn hàng <strong>#{{order_number}}</strong> của bạn đã được tiếp nhận.</p><p>Tổng tiền: {{total_amount}}</p>',
   'Cảm ơn bạn đã đặt hàng! Đơn hàng #{{order_number}} của bạn đã được tiếp nhận. Tổng tiền: {{total_amount}}',
   '["order_number", "total_amount", "customer_name", "items"]'::jsonb),
  ('order_shipped',
   'Đơn hàng #{{order_number}} đã được giao cho đơn vị vận chuyển',
   '<h1>Đơn hàng đang trên đường giao đến bạn!</h1><p>Mã vận đơn: <strong>{{tracking_number}}</strong></p><p>Đơn vị vận chuyển: {{shipping_provider}}</p>',
   'Đơn hàng đang trên đường giao đến bạn! Mã vận đơn: {{tracking_number}}. Đơn vị vận chuyển: {{shipping_provider}}',
   '["order_number", "tracking_number", "shipping_provider"]'::jsonb),
  ('order_delivered',
   'Đơn hàng #{{order_number}} đã được giao thành công',
   '<h1>Đơn hàng đã được giao!</h1><p>Cảm ơn bạn đã mua hàng tại FlySky Guitar.</p>',
   'Đơn hàng đã được giao! Cảm ơn bạn đã mua hàng tại FlySky Guitar.',
   '["order_number", "customer_name"]'::jsonb)
ON CONFLICT (template_key) DO NOTHING;

-- Insert default shipping providers
INSERT INTO shipping_providers (provider_code, provider_name, enabled, config) VALUES
  ('ghtk', 'Giao Hàng Tiết Kiệm', false, '{
    "api_token": "",
    "api_url": "https://services.giaohangtietkiem.vn",
    "shop_id": "",
    "pick_address": {
      "province": "",
      "district": "",
      "ward": "",
      "address": ""
    }
  }'::jsonb),
  ('ghn', 'Giao Hàng Nhanh', false, '{
    "api_token": "",
    "api_url": "https://dev-online-gateway.ghn.vn",
    "shop_id": "",
    "from_district_id": ""
  }'::jsonb),
  ('viettel_post', 'Viettel Post', false, '{
    "username": "",
    "password": "",
    "api_url": "https://partner.viettelpost.vn/v2",
    "customer_id": "",
    "sender_phone": "",
    "sender_address": ""
  }'::jsonb),
  ('vnpost', 'VNPost', false, '{
    "api_key": "",
    "api_url": "https://donhang.vnpost.vn/api",
    "customer_code": ""
  }'::jsonb),
  ('jnt', 'J&T Express', false, '{
    "api_key": "",
    "api_url": "https://api.jtexpress.vn",
    "customer_code": "",
    "sender_info": {}
  }'::jsonb),
  ('self_delivery', 'Tự giao hàng', true, '{
    "base_fee": 30000,
    "free_shipping_threshold": 5000000
  }'::jsonb)
ON CONFLICT (provider_code) DO NOTHING;

-- Insert default shipping rates (for self_delivery)
INSERT INTO shipping_rates (provider_code, from_province, to_province, weight_from, weight_to, base_fee, per_kg_fee) VALUES
  ('self_delivery', NULL, NULL, 0, 5, 30000, 0),
  ('self_delivery', NULL, NULL, 5, 10, 50000, 5000),
  ('self_delivery', NULL, NULL, 10, NULL, 80000, 8000)
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_trackings ENABLE ROW LEVEL SECURITY;

-- Email Settings Policies
CREATE POLICY "Authenticated users can read email settings"
  ON email_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update email settings"
  ON email_settings FOR UPDATE
  TO authenticated
  USING (true);

-- Email Templates Policies
CREATE POLICY "Anyone can read email templates"
  ON email_templates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (true);

-- Email Logs Policies
CREATE POLICY "Authenticated users can read email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert email logs"
  ON email_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Shipping Providers Policies
CREATE POLICY "Anyone can read enabled shipping providers"
  ON shipping_providers FOR SELECT
  TO anon, authenticated
  USING (enabled = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage shipping providers"
  ON shipping_providers FOR ALL
  TO authenticated
  USING (true);

-- Shipping Rates Policies
CREATE POLICY "Anyone can read enabled shipping rates"
  ON shipping_rates FOR SELECT
  TO anon, authenticated
  USING (enabled = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage shipping rates"
  ON shipping_rates FOR ALL
  TO authenticated
  USING (true);

-- Shipping Trackings Policies
CREATE POLICY "Anyone can read shipping trackings"
  ON shipping_trackings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage shipping trackings"
  ON shipping_trackings FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate shipping fee
CREATE OR REPLACE FUNCTION calculate_shipping_fee(
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
  -- Find matching rate
  SELECT * INTO v_rate
  FROM shipping_rates
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

-- Function to log email
CREATE OR REPLACE FUNCTION log_email(
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
  INSERT INTO email_logs (recipient, subject, template_key, provider, status, metadata)
  VALUES (p_recipient, p_subject, p_template_key, p_provider, p_status, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;
