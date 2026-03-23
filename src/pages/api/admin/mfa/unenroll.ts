import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const accessToken = cookieHeader
      .split(';').map(c => c.trim())
      .find(c => c.startsWith('sb-access-token='))?.split('=')[1];
    const refreshToken = cookieHeader
      .split(';').map(c => c.trim())
      .find(c => c.startsWith('sb-refresh-token='))?.split('=')[1];

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Chưa xác thực' }), { status: 401, headers: corsHeaders });
    }

    // List and unenroll all TOTP factors
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: corsHeaders });
    }

    if (data?.totp) {
      for (const factor of data.totp) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Đã tắt xác thực 2 lớp.' }), { headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Lỗi hệ thống' }), { status: 500, headers: corsHeaders });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};
