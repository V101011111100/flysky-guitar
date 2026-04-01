-- Cleanup legacy rows that are no longer useful for active session tracking.
DELETE FROM public.user_sessions
WHERE expires_at < NOW()
   OR (is_active = false AND last_activity < NOW() - INTERVAL '14 days');

-- Keep cleanup logic in SQL so it can be invoked by cron/maintenance jobs later.
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions(retention_days INTEGER DEFAULT 14)
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < NOW()
     OR (is_active = false AND last_activity < NOW() - make_interval(days => retention_days));
END;
$$ LANGUAGE plpgsql;
