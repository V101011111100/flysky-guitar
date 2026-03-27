import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../lib/email';
import { ensureSameOrigin, getAdminMfaState } from '../../../lib/security';

function getAdminClient() {
  const url = import.meta.env.SUPABASE_URL || '';
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function renderCampaignHtml(subject: string, body: string): string {
  return `
  <!doctype html>
  <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
        <tr>
          <td align="center">
            <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
              <tr>
                <td style="background:#f48c25;color:#221910;padding:16px 24px;font-size:20px;font-weight:700;">FlySky Guitar</td>
              </tr>
              <tr>
                <td style="padding:24px;">
                  <h1 style="margin:0 0 12px 0;color:#1f2937;font-size:22px;line-height:1.35;">${subject}</h1>
                  <div style="color:#374151;font-size:15px;line-height:1.7;white-space:pre-wrap;">${body}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;color:#9ca3af;font-size:12px;border-top:1px solid #f1f5f9;">
                  Bạn nhận email này vì đã đăng ký bản tin từ FlySky Guitar.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;
    const authState = await getAdminMfaState(accessToken, refreshToken);
    if (!authState.authenticated || !authState.isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json().catch(() => ({}));
    const fallbackSubject = 'Bản tin mới từ FlySky Guitar';
    const fallbackContent = 'FlySky Guitar vừa có cập nhật mới dành cho bạn. Truy cập website để xem chi tiết.';

    const subject = typeof body?.subject === 'string' && body.subject.trim()
      ? body.subject.trim()
      : fallbackSubject;
    const content = typeof body?.content === 'string' && body.content.trim()
      ? body.content.trim()
      : fallbackContent;

    const admin = getAdminClient();
    const { data: subscribers, error: subErr } = await admin
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'Đang hoạt động');

    if (subErr) {
      return new Response(JSON.stringify({ success: false, error: 'Không thể lấy danh sách subscriber' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emails = (subscribers || []).map((s: any) => s.email).filter(Boolean);
    if (emails.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Chưa có subscriber đang hoạt động' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = renderCampaignHtml(subject, content);
    const sendResults = await Promise.allSettled(
      emails.map((email) => sendEmail({ to: email, subject, html, templateKey: 'email_custom_campaign' }))
    );

    let sentCount = 0;
    let failCount = 0;
    for (const r of sendResults) {
      if (r.status === 'fulfilled' && r.value.success) sentCount += 1;
      else failCount += 1;
    }

    const openRate = sentCount > 0 ? 0 : 0;
    await admin.from('email_campaigns').insert({
      title: subject,
      status: failCount === 0 ? 'HOÀN THÀNH' : (sentCount > 0 ? 'MỘT PHẦN' : 'THẤT BẠI'),
      sent_at: new Date().toISOString(),
      open_rate: openRate,
      click_rate: 0,
    });

    return new Response(JSON.stringify({
      success: true,
      sent: sentCount,
      failed: failCount,
      total: emails.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
