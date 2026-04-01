import { sendEmail } from './email';

export type MarketingWorkflowKey =
  | 'welcome_series'
  | 'abandoned_cart'
  | 'birthday_offer'
  | 'custom_manual';

export type MarketingTriggerEvent = 'newsletter_subscribed' | 'order_created';

type WorkflowLike = {
  workflow_key?: string | null;
  title?: string | null;
  description?: string | null;
  trigger_event?: string | null;
  email_subject?: string | null;
  email_body?: string | null;
  is_active?: boolean | null;
  id?: string | null;
  trigger_count?: number | null;
  last_triggered_at?: string | null;
  last_status?: string | null;
};

const ALLOWED_KEYS: MarketingWorkflowKey[] = [
  'welcome_series',
  'abandoned_cart',
  'birthday_offer',
  'custom_manual',
];

function slugifyVi(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function inferMarketingWorkflowKey(input: {
  workflowKey?: unknown;
  title?: unknown;
}): MarketingWorkflowKey {
  if (typeof input.workflowKey === 'string') {
    const normalized = input.workflowKey.trim().toLowerCase() as MarketingWorkflowKey;
    if (ALLOWED_KEYS.includes(normalized)) return normalized;
  }

  const title = typeof input.title === 'string' ? slugifyVi(input.title) : '';
  if (!title) return 'custom_manual';

  if (title.includes('chao_mung') || title.includes('welcome')) return 'welcome_series';
  if (title.includes('gio_hang_bo_quen') || title.includes('abandoned_cart')) return 'abandoned_cart';
  if (title.includes('sinh_nhat') || title.includes('birthday')) return 'birthday_offer';

  return 'custom_manual';
}

export function describeMarketingWorkflow(workflow: WorkflowLike) {
  const key = inferMarketingWorkflowKey({
    workflowKey: workflow.workflow_key,
    title: workflow.title,
  });

  if (key === 'welcome_series') {
    return {
      key,
      label: 'Chuỗi chào mừng',
      supported: true,
      automationMode: 'Tự động khi có người đăng ký newsletter mới',
      detail: 'Workflow này đã được nối với API subscribe newsletter và sẽ gửi email chào mừng nếu workflow đang bật.',
    };
  }

  if (key === 'abandoned_cart') {
    return {
      key,
      label: 'Giỏ hàng bỏ quên',
      supported: false,
      automationMode: 'Chưa thể tự động',
      detail: 'Hệ thống hiện chỉ lưu giỏ hàng ở localStorage phía client, chưa có dữ liệu cart server-side để xác định giỏ hàng bị bỏ quên.',
    };
  }

  if (key === 'birthday_offer') {
    return {
      key,
      label: 'Chúc mừng sinh nhật',
      supported: false,
      automationMode: 'Chưa thể tự động',
      detail: 'Chưa có trường ngày sinh trong dữ liệu khách hàng/subscriber nên chưa thể chạy lịch gửi sinh nhật một cách chính xác.',
    };
  }

  if (key === 'custom_manual' && workflow.trigger_event === 'newsletter_subscribed') {
    return {
      key,
      label: workflow.title || 'Workflow tuỳ chỉnh',
      supported: true,
      automationMode: 'Tự động khi có người đăng ký newsletter mới',
      detail: 'Workflow custom này sẽ gửi email theo nội dung bạn cấu hình mỗi khi có subscriber mới hoặc subscriber được kích hoạt lại.',
    };
  }

  if (key === 'custom_manual' && workflow.trigger_event === 'order_created') {
    return {
      key,
      label: workflow.title || 'Workflow tuỳ chỉnh',
      supported: true,
      automationMode: 'Tự động sau khi tạo đơn hàng',
      detail: 'Workflow custom này sẽ gửi email theo nội dung bạn cấu hình cho khách hàng ngay sau khi đơn hàng được tạo thành công.',
    };
  }

  return {
    key,
    label: workflow.title || 'Workflow tuỳ chỉnh',
    supported: false,
    automationMode: 'Workflow thủ công',
    detail: 'Workflow tuỳ chỉnh sẽ hoạt động thật khi được gán trigger event hợp lệ như newsletter_subscribed hoặc order_created.',
  };
}

function replaceWorkflowVars(template: string, vars: Record<string, string>): string {
  let output = template || '';
  for (const [key, value] of Object.entries(vars)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }
  return output;
}

function buildCustomWorkflowHtml(title: string, body: string): string {
  const safeTitle = escapeHtml(title);
  const safeBody = body
    .split('\n')
    .map((line) => `<p style="margin:0 0 12px 0;">${escapeHtml(line)}</p>`)
    .join('');

  return `<!doctype html>
  <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
        <tr>
          <td align="center">
            <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #eee;">
              <tr>
                <td style="background:#f48c25;color:#221910;padding:18px 24px;font-size:20px;font-weight:700;">FlySky Guitar</td>
              </tr>
              <tr>
                <td style="padding:28px 24px;">
                  <h1 style="margin:0 0 16px 0;color:#111827;font-size:24px;line-height:1.35;">${safeTitle}</h1>
                  <div style="color:#374151;font-size:15px;line-height:1.7;">${safeBody}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function getEventVars(event: MarketingTriggerEvent, payload: Record<string, unknown>) {
  if (event === 'newsletter_subscribed') {
    return {
      customer_name: String(payload.customer_name || 'bạn'),
      email: String(payload.email || ''),
      store_name: 'FlySky Guitar',
      order_number: '',
      total_amount: '',
    };
  }

  return {
    customer_name: String(payload.customer_name || 'bạn'),
    email: String(payload.email || ''),
    store_name: 'FlySky Guitar',
    order_number: String(payload.order_number || ''),
    total_amount: String(payload.total_amount || ''),
  };
}

async function updateWorkflowRuntime(admin: any, workflow: WorkflowLike, status: string) {
  try {
    const currentCount = typeof workflow.trigger_count === 'number' ? workflow.trigger_count : 0;
    await admin
      .from('marketing_workflows')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status: status,
        trigger_count: currentCount + 1,
      })
      .eq('id', workflow.id);
  } catch {}
}

async function logWorkflowCampaign(admin: any, title: string, status: string) {
  try {
    await admin.from('email_campaigns').insert({
      title,
      status,
      sent_at: new Date().toISOString(),
      open_rate: 0,
      click_rate: 0,
    });
  } catch {}
}

export function renderWelcomeNewsletterHtml(email: string): string {
  const safeEmail = escapeHtml(email);

  return `<!doctype html>
  <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
        <tr>
          <td align="center">
            <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #eee;">
              <tr>
                <td style="background:#1f2937;color:#fff;padding:18px 24px;font-size:20px;font-weight:700;">FlySky Guitar</td>
              </tr>
              <tr>
                <td style="padding:28px 24px;">
                  <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fff7ed;color:#ea580c;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Chuỗi chào mừng</div>
                  <h1 style="margin:16px 0 12px 0;color:#111827;font-size:24px;line-height:1.35;">Chào mừng bạn đến với bản tin FlySky Guitar</h1>
                  <p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.7;">Email <strong>${safeEmail}</strong> đã được thêm vào danh sách nhận tin. Từ bây giờ bạn sẽ nhận được các cập nhật về sản phẩm mới, ưu đãi và nội dung chuyên sâu về guitar từ FlySky.</p>
                  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 18px;margin:0 0 18px 0;">
                    <p style="margin:0 0 8px 0;color:#9a3412;font-size:13px;font-weight:700;">Bạn sẽ nhận được gì?</p>
                    <ul style="margin:0;padding-left:18px;color:#7c2d12;font-size:14px;line-height:1.7;">
                      <li>Thông báo ưu đãi mới nhất</li>
                      <li>Bài viết kinh nghiệm chọn đàn và setup</li>
                      <li>Thông tin ra mắt sản phẩm và workshop</li>
                    </ul>
                  </div>
                  <a href="/shop" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#f48c25;color:#221910;text-decoration:none;font-size:14px;font-weight:700;">Khám phá sản phẩm</a>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;color:#9ca3af;font-size:12px;border-top:1px solid #f1f5f9;line-height:1.6;">
                  Bạn nhận email này vì đã đăng ký bản tin từ FlySky Guitar. Nếu không còn muốn nhận thư, bạn có thể liên hệ bộ phận hỗ trợ để được huỷ đăng ký.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

export async function triggerWelcomeSeriesWorkflow(admin: any, email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: workflows, error: workflowErr } = await admin
    .from('marketing_workflows')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (workflowErr) {
    return { triggered: false, reason: workflowErr.message };
  }

  const workflow = (workflows || []).find((item: WorkflowLike) => {
    return inferMarketingWorkflowKey({
      workflowKey: item.workflow_key,
      title: item.title,
    }) === 'welcome_series';
  });

  if (!workflow?.id) {
    return { triggered: false, reason: 'inactive' };
  }

  const subject = 'Chào mừng bạn đến với bản tin FlySky Guitar';
  const html = renderWelcomeNewsletterHtml(normalizedEmail);
  const sendResult = await sendEmail({
    to: normalizedEmail,
    subject,
    html,
    templateKey: 'workflow_welcome_series',
  });

  await logWorkflowCampaign(admin, `WF • Chuỗi chào mừng • ${normalizedEmail}`, sendResult.success ? 'HOÀN THÀNH' : 'THẤT BẠI');
  await updateWorkflowRuntime(admin, workflow, sendResult.success ? 'sent' : `failed:${sendResult.error || 'unknown'}`);

  return {
    triggered: sendResult.success,
    reason: sendResult.success ? 'sent' : (sendResult.error || 'send_failed'),
  };
}

export async function triggerCustomWorkflowEvent(
  admin: any,
  event: MarketingTriggerEvent,
  recipient: string | null | undefined,
  payload: Record<string, unknown>
) {
  const normalizedRecipient = typeof recipient === 'string' ? recipient.trim().toLowerCase() : '';
  if (!normalizedRecipient) {
    return { triggered: 0, skipped: 0, failed: 0 };
  }

  const { data: workflows, error } = await admin
    .from('marketing_workflows')
    .select('*')
    .eq('is_active', true)
    .eq('workflow_key', 'custom_manual')
    .eq('trigger_event', event)
    .order('created_at', { ascending: true });

  if (error || !workflows?.length) {
    return { triggered: 0, skipped: 0, failed: 0 };
  }

  let triggered = 0;
  let skipped = 0;
  let failed = 0;
  const vars = getEventVars(event, payload);

  for (const workflow of workflows) {
    const subjectTemplate = typeof workflow.email_subject === 'string' && workflow.email_subject.trim()
      ? workflow.email_subject.trim()
      : workflow.title || 'FlySky Guitar';
    const bodyTemplate = typeof workflow.email_body === 'string' && workflow.email_body.trim()
      ? workflow.email_body.trim()
      : (workflow.description || 'Thông báo từ FlySky Guitar');

    if (!subjectTemplate || !bodyTemplate) {
      skipped += 1;
      await updateWorkflowRuntime(admin, workflow, 'skipped:missing_template');
      continue;
    }

    const subject = replaceWorkflowVars(subjectTemplate, vars);
    const body = replaceWorkflowVars(bodyTemplate, vars);
    const html = buildCustomWorkflowHtml(subject, body);
    const result = await sendEmail({
      to: normalizedRecipient,
      subject,
      html,
      templateKey: `workflow_custom_${event}`,
    });

    if (result.success) {
      triggered += 1;
      await logWorkflowCampaign(admin, `WF • ${workflow.title || 'Custom'} • ${normalizedRecipient}`, 'HOÀN THÀNH');
      await updateWorkflowRuntime(admin, workflow, 'sent');
    } else {
      failed += 1;
      await logWorkflowCampaign(admin, `WF • ${workflow.title || 'Custom'} • ${normalizedRecipient}`, 'THẤT BẠI');
      await updateWorkflowRuntime(admin, workflow, `failed:${result.error || 'unknown'}`);
    }
  }

  return { triggered, skipped, failed };
}