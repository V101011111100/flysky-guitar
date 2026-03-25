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
  return new Response(null, { status: 204, headers: corsHeaders });
};
