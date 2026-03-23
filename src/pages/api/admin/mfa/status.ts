import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const GET: APIRoute = async ({ request }) => {
  try {
    // Get auth token from cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const accessToken = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('sb-access-token='))
      ?.split('=')[1];

    const refreshToken = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('sb-refresh-token='))
      ?.split('=')[1];

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Chưa xác thực' }), { status: 401, headers: corsHeaders });
    }

    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      return new Response(JSON.stringify({ success: true, enabled: false, factors: [] }), { headers: corsHeaders });
    }

    const verifiedFactors = data?.totp?.filter((f: any) => f.status === 'verified') || [];

    return new Response(JSON.stringify({
      success: true,
      enabled: verifiedFactors.length > 0,
      factors: verifiedFactors.map((f: any) => ({ id: f.id, name: f.friendly_name, status: f.status }))
    }), { headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Lỗi hệ thống' }), { status: 500, headers: corsHeaders });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};
