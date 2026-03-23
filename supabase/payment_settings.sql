-- Payment Settings Table
CREATE TABLE IF NOT EXISTS payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE CHECK (provider IN ('bank_transfer', 'momo', 'vietqr', 'stripe', 'cash')),
  enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payment Transactions Log Table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  transaction_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'VND',
  status text CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(provider);

-- Insert default payment providers
INSERT INTO payment_settings (provider, enabled, config) VALUES
  ('bank_transfer', true, '{"bank_name": "BIDV", "account_name": "CÔNG TY TNHH FLYSKY GUITAR", "account_number": "1234567890"}'::jsonb),
  ('momo', false, '{"partner_code": "", "access_key": "", "secret_key": "", "endpoint": "https://test-payment.momo.vn/v2/gateway/api/create"}'::jsonb),
  ('vietqr', false, '{"bank_id": "970418", "account_no": "", "account_name": "", "template": "compact"}'::jsonb),
  ('stripe', false, '{"public_key": "", "secret_key": "", "webhook_secret": ""}'::jsonb),
  ('cash', true, '{}'::jsonb)
ON CONFLICT (provider) DO NOTHING;

-- RLS Policies
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read payment settings
CREATE POLICY "Authenticated users can read payment settings"
  ON payment_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can update payment settings
CREATE POLICY "Authenticated users can update payment settings"
  ON payment_settings FOR UPDATE
  TO authenticated
  USING (true);

-- Anyone can insert payment transactions (for webhooks)
CREATE POLICY "Anyone can insert payment transactions"
  ON payment_transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can read all transactions
CREATE POLICY "Authenticated users can read transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (true);
