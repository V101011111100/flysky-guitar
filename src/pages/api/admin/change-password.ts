import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Người dùng chưa xác thực.'
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
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
};
