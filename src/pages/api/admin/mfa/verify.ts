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

    const body = await request.json();
    const { factorId, code } = body;

    if (!factorId || !code) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu factorId hoặc mã xác thực' }), { status: 400, headers: corsHeaders });
    }

    // Create challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      return new Response(JSON.stringify({ success: false, error: 'Lỗi tạo challenge: ' + challengeError.message }), { status: 400, headers: corsHeaders });
    }

    // Verify
    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code
    });

    if (verifyError) {
      return new Response(JSON.stringify({ success: false, error: 'Mã xác thực không đúng' }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, message: 'Đã kích hoạt 2FA thành công!' }), { headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Lỗi hệ thống' }), { status: 500, headers: corsHeaders });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};
