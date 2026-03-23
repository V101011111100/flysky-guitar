-- Create custom sessions table for advanced session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  refresh_token TEXT,
  device_name TEXT,
  device_type TEXT,
  browser TEXT,
  ip_address TEXT,
  location TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Enable RLS (Row Level Security) for security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow users to manage their own sessions
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Create policy to allow authenticated users to read their own sessions
CREATE POLICY "Users can read their own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow authenticated users to update their own sessions
CREATE POLICY "Users can update their own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow authenticated users to delete their own sessions
CREATE POLICY "Users can delete their own sessions" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_sessions 
  WHERE expires_at < NOW() OR is_active = false;
END;
$$ LANGUAGE plpgsql;
