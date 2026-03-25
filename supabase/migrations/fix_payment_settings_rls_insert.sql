-- Fix: add missing INSERT policy on payment_settings
-- Without this, upsert fails with RLS violation when the provider row
-- does not yet exist (INSERT path of upsert is blocked).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_settings'
    AND policyname = 'Authenticated users can insert payment settings'
  ) THEN
    CREATE POLICY "Authenticated users can insert payment settings"
      ON payment_settings FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
