import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { sendEmail } from '../../../lib/email';
import { ensureSameOrigin } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { test_email } = await request.json();

    if (!test_email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Vui lòng nhập địa chỉ email nhận thử nghiệm.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendEmail({
      to: test_email,
      subject: '✅ FlySky Guitar — Email test thành công!',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:10px;border:1px solid #eee;">
          <h2 style="color:#f48c25;margin-top:0;">✅ Kết nối SMTP thành công!</h2>
          <p style="color:#444;">Cấu hình email của FlySky Guitar đang hoạt động bình thường.</p>
          <p style="color:#444;">Email này được gửi vào: <strong>${new Date().toLocaleString('vi-VN')}</strong></p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/>
          <p style="color:#aaa;font-size:12px;">FlySky Guitar Admin — Cài đặt Email & Thông báo</p>
        </div>
      `,
      templateKey: 'test',
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
