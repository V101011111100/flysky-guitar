import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies, url }) => {
  const accessToken = cookies.get('sb-access-token');
  const refreshToken = cookies.get('sb-refresh-token');

  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
  }

  const { data: authData, error: authError } = await supabase.auth.setSession({
    access_token: accessToken.value,
    refresh_token: refreshToken.value,
  });

  if (authError || !authData.user) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
  }

  try {
    // Fetch 15 most recent activity logs
    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('id, action_type, action_text, module_name, user_name, created_at')
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) throw error;

    // Count unseen: logs newer than the `since` query param (ISO string from localStorage)
    const sinceParam = url.searchParams.get('since');
    let unseenCount = 0;
    if (sinceParam) {
      const sinceDate = new Date(sinceParam);
      if (!isNaN(sinceDate.getTime())) {
        unseenCount = (logs ?? []).filter(l => new Date(l.created_at) > sinceDate).length;
      }
    } else {
      unseenCount = logs?.length ?? 0;
    }

    return new Response(JSON.stringify({ success: true, logs: logs ?? [], unseenCount }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
