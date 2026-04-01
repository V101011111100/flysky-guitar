-- Keep session lookups and cleanup performant as the table grows.
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active_last_activity
  ON public.user_sessions (user_id, is_active, last_activity DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
  ON public.user_sessions (expires_at);

-- Schedule periodic cleanup when pg_cron is available (Supabase production).
DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jobid INTO existing_job_id
    FROM cron.job
    WHERE jobname = 'cleanup_user_sessions_hourly'
    LIMIT 1;

    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
    END IF;

    PERFORM cron.schedule(
      'cleanup_user_sessions_hourly',
      '15 * * * *',
      $cron$SELECT public.cleanup_expired_sessions(14);$cron$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Unable to configure pg_cron job cleanup_user_sessions_hourly: %', SQLERRM;
END;
$$;
