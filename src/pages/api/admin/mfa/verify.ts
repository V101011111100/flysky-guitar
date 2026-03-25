import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { ensureSameOrigin } from '../../../../lib/security';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken.value, refresh_token: refreshToken.value });
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
  return new Response(null, { status: 204, headers: corsHeaders });
};
