ALTER TABLE public.marketing_workflows
  ADD COLUMN IF NOT EXISTS workflow_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS trigger_event VARCHAR(100),
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_body TEXT,
  ADD COLUMN IF NOT EXISTS trigger_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_status VARCHAR(120) DEFAULT 'never';

UPDATE public.marketing_workflows
SET workflow_key = 'welcome_series'
WHERE workflow_key IS NULL
  AND (
    lower(title) LIKE '%chào mừng%'
    OR lower(title) LIKE '%welcome%'
  );

UPDATE public.marketing_workflows
SET workflow_key = 'abandoned_cart'
WHERE workflow_key IS NULL
  AND (
    lower(title) LIKE '%giỏ hàng bỏ quên%'
    OR lower(title) LIKE '%abandoned%'
  );

UPDATE public.marketing_workflows
SET workflow_key = 'birthday_offer'
WHERE workflow_key IS NULL
  AND (
    lower(title) LIKE '%sinh nhật%'
    OR lower(title) LIKE '%birthday%'
  );

UPDATE public.marketing_workflows
SET workflow_key = 'custom_manual'
WHERE workflow_key IS NULL;

UPDATE public.marketing_workflows
SET trigger_event = 'newsletter_subscribed'
WHERE workflow_key = 'welcome_series'
  AND trigger_event IS NULL;