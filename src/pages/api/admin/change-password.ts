import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.'
      }), { status: 400, headers: corsHeaders });
    }

    if (newPassword.length < 8) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Mật khẩu mới phải có ít nhất 8 ký tự.'
      }), { status: 400, headers: corsHeaders });
    }

    // Get current user from cookies
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');
    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Người dùng chưa xác thực.'
      }), { status: 401, headers: corsHeaders });
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });
    const user = sessionData?.user;
    if (sessionError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'
      }), { status: 401, headers: corsHeaders });
    }

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (signInError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Mật khẩu hiện tại không đúng.'
      }), { status: 400, headers: corsHeaders });
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Lỗi cập nhật mật khẩu: ' + updateError.message
      }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Đã cập nhật mật khẩu thành công!'
    }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Lỗi hệ thống: ' + (error?.message || 'Không xác định')
    }), { status: 500, headers: corsHeaders });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
};
