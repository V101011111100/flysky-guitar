import { supabase } from './supabase';
import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateKey?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['flysky_smtpHost', 'flysky_smtpPort', 'flysky_smtpUser', 'flysky_smtpPass', 'flysky_smtpFromName']);

    const get = (key: string, def = '') =>
      settings?.find((s: any) => s.key === key)?.value || def;

    const host     = get('flysky_smtpHost');
    const port     = parseInt(get('flysky_smtpPort', '587'));
    const user     = get('flysky_smtpUser');
    const pass     = get('flysky_smtpPass');
    const fromName = get('flysky_smtpFromName', 'FlySky Guitar');

    if (!host || !user || !pass) {
      return {
        success: false,
        error: 'SMTP chưa được cấu hình. Vào Cài đặt → Email & Thông báo để thiết lập.',
      };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `${fromName} <${user}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    try {
      await supabase.from('email_logs').insert({
        recipient: options.to,
        subject: options.subject,
        template_key: options.templateKey || null,
        provider: 'smtp',
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    } catch {}

    return { success: true };
  } catch (error: any) {
    try {
      await supabase.from('email_logs').insert({
        recipient: options.to,
        subject: options.subject,
        template_key: options.templateKey || null,
        provider: 'smtp',
        status: 'failed',
        error_message: error.message,
      });
    } catch {}

    return { success: false, error: error.message };
  }
}

export function buildOrderNotificationHtml(params: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: string;
  paymentMethod: string;
  totalAmount: number;
  note?: string;
}): string {
  const fmt = (n: number) =>
    n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  return `
<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;}
  .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);}
  .header{background:#f48c25;padding:24px 32px;color:#fff;}
  .header h1{margin:0;font-size:20px;}
  .body{padding:28px 32px;}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;}
  .label{color:#888;}
  .value{font-weight:600;color:#222;}
  .total{background:#fff8f0;border-radius:8px;padding:14px 20px;margin-top:18px;font-size:18px;font-weight:700;color:#f48c25;text-align:center;}
  .footer{padding:16px 32px;background:#f9f9f9;font-size:12px;color:#aaa;text-align:center;}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>🛒 Đơn hàng mới — #${params.orderNumber}</h1>
    <p style="margin:4px 0 0;opacity:.85;font-size:13px;">${new Date().toLocaleString('vi-VN')}</p>
  </div>
  <div class="body">
    <div class="row"><span class="label">Khách hàng</span><span class="value">${params.customerName}</span></div>
    <div class="row"><span class="label">Số điện thoại</span><span class="value">${params.customerPhone}</span></div>
    ${params.customerEmail ? `<div class="row"><span class="label">Email</span><span class="value">${params.customerEmail}</span></div>` : ''}
    ${params.shippingAddress ? `<div class="row"><span class="label">Địa chỉ</span><span class="value">${params.shippingAddress}</span></div>` : ''}
    <div class="row"><span class="label">Thanh toán</span><span class="value">${params.paymentMethod}</span></div>
    ${params.note ? `<div class="row"><span class="label">Ghi chú</span><span class="value">${params.note}</span></div>` : ''}
    <div class="total">Tổng tiền: ${fmt(params.totalAmount)}</div>
  </div>
  <div class="footer">FlySky Guitar — Quản lý đơn hàng tại <a href="/admin/orders">/admin/orders</a></div>
</div>
</body></html>`;
}

// ─── DB-template-based order confirmation email ─────────────────────────────

interface OrderEmailVars {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  payment_method: string;
  total_amount: number;
  items?: Array<{ name: string; quantity: number; price: number }>;
  note?: string;
}

function replaceVars(text: string, vars: Record<string, string>): string {
  let out = text || '';
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

/**
 * Fetches the active `email_order_confirm` template from `print_templates`.
 * If found, renders it into a full HTML email.
 * Falls back to the hardcoded `buildOrderConfirmationHtml()` if no template exists.
 */
export async function buildOrderConfirmationFromTemplate(
  params: OrderEmailVars
): Promise<{ subject: string; html: string }> {
  const fmt = (n: number) =>
    n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  // 1. Try to load active template
  const { data: tpl } = await supabase
    .from('print_templates')
    .select('settings')
    .eq('type', 'email_order_confirm')
    .eq('is_active', true)
    .limit(1)
    .single();

  // 2. No template — fall back to hardcoded builder
  if (!tpl?.settings) {
    return {
      subject: `✅ Xác nhận đơn hàng #${params.order_number} — FlySky Guitar`,
      html: buildOrderConfirmationHtml({
        orderNumber: params.order_number,
        customerName: params.customer_name,
        customerPhone: params.customer_phone,
        shippingAddress: params.customer_address,
        paymentMethod: params.payment_method,
        totalAmount: params.total_amount,
        items: params.items,
        note: params.note,
      }),
    };
  }

  // 3. Build variable map
  const s = tpl.settings as Record<string, string>;
  const firstItem = params.items?.[0];
  const vars: Record<string, string> = {
    customer_name: params.customer_name,
    customer_phone: params.customer_phone,
    order_id: params.order_number,
    product_name:
      firstItem?.name ||
      params.items?.map((i) => i.name).join(', ') ||
      'Sản phẩm',
    product_price: fmt(params.total_amount),
    product_qty: String(
      params.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 1
    ),
  };

  const r = (key: string, fallback = '') =>
    replaceVars(s[key] || fallback, vars);

  const storeName    = r('email_store_name', 'FlySky Guitar');
  const subject      = r('email_subject', `✅ Xác nhận đơn hàng #${params.order_number} — FlySky Guitar`);
  const heroTitle    = r('email_hero_title', 'Đơn hàng của bạn đã được xác nhận!');
  const greeting     = r('email_greeting', `Chào ${params.customer_name}!`);
  const body         = r('email_body', '');
  const ctaPrimary   = r('email_cta_primary', 'Tiếp tục mua sắm');
  const ctaSecondary = r('email_cta_secondary', 'Xem đơn hàng');
  const supportPhone = r('email_support_phone');
  const warrantyText = r('email_warranty_text');
  const warrantySub  = r('email_warranty_sub');
  const storeAddress = r('email_store_address');
  const storeHours   = r('email_store_hours');

  // 4. Build items table rows
  const itemRows = params.items?.length
    ? params.items
        .map(
          (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece4;color:#333;">${item.name}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece4;text-align:center;color:#555;">×${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece4;text-align:right;font-weight:600;color:#e67e22;">${fmt(item.price * item.quantity)}</td>
      </tr>`
        )
        .join('')
    : '';

  const productBlock = itemRows
    ? `<table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead><tr>
          <th style="text-align:left;font-size:11px;color:#aaa;padding-bottom:8px;border-bottom:2px solid #f0ece4;">Sản phẩm</th>
          <th style="text-align:center;font-size:11px;color:#aaa;padding-bottom:8px;border-bottom:2px solid #f0ece4;">SL</th>
          <th style="text-align:right;font-size:11px;color:#aaa;padding-bottom:8px;border-bottom:2px solid #f0ece4;">Thành tiền</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding-top:10px;font-weight:700;color:#1e293b;">Tổng thanh toán</td>
          <td style="padding-top:10px;text-align:right;font-weight:700;font-size:16px;color:#e67e22;">${fmt(params.total_amount)}</td>
        </tr></tfoot>
      </table>`
    : `<p style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">Đơn hàng #${params.order_number}</p>
       <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#e67e22;">${fmt(params.total_amount)}</p>`;

  const noteBlock = params.note
    ? `<div style="background:#fffbf5;border-left:3px solid #e67e22;padding:10px 14px;font-size:13px;color:#555;margin-bottom:20px;border-radius:0 6px 6px 0;">📝 <strong>Ghi chú:</strong> ${params.note}</div>`
    : '';

  const supportBlock =
    supportPhone || warrantyText
      ? `<div style="display:flex;gap:24px;margin-top:8px;padding-top:16px;border-top:1px solid #f0f0f0;font-size:12px;color:#666;">
          ${supportPhone ? `<div style="flex:1;"><p style="margin:0;font-weight:700;color:#333;">📞 Hỗ trợ kỹ thuật</p><p style="margin:2px 0 0;">${supportPhone}</p></div>` : ''}
          ${warrantyText ? `<div style="flex:1;"><p style="margin:0;font-weight:700;color:#333;">${warrantyText}</p><p style="margin:2px 0 0;">${warrantySub}</p></div>` : ''}
        </div>`
      : '';

  // 5. Assemble full HTML
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);">

  <!-- Top bar -->
  <div style="background:#fff;border-bottom:1px solid #f0f0f0;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-weight:700;font-size:15px;color:#1e293b;">${storeName}</span>
    <span style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em;">THÔNG BÁO ĐƠN HÀNG</span>
  </div>

  <!-- Hero banner -->
  <div style="background:linear-gradient(135deg,#1e293b,#374151);padding:36px 32px;">
    <h2 style="color:#fff;font-size:20px;font-weight:800;margin:0;line-height:1.35;">${heroTitle}</h2>
  </div>

  <!-- Main content -->
  <div style="padding:28px 32px;">
    <h3 style="text-align:center;font-size:17px;font-weight:700;color:#1e293b;margin:0 0 10px;">${greeting}</h3>
    <p style="text-align:center;color:#666;font-size:13px;line-height:1.7;margin:0 0 20px;">${body.replace(/\n/g, '<br/>')}</p>

    <!-- Product card -->
    <div style="background:#fdf9f4;border:1px solid #f0e4d0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <p style="font-size:10px;font-weight:700;color:#e67e22;text-transform:uppercase;letter-spacing:.1em;margin:0 0 10px;">SẢN PHẨM ĐÃ MUA</p>
      ${productBlock}
    </div>

    ${noteBlock}

    <!-- CTA buttons -->
    <div style="text-align:center;margin-bottom:10px;">
      <a href="/" style="display:inline-block;background:#e67e22;color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:15px;">${ctaPrimary}</a>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="/admin/orders" style="display:inline-block;border:1px solid #ddd;color:#555;text-decoration:none;padding:11px 28px;border-radius:8px;font-size:14px;">${ctaSecondary}</a>
    </div>

    ${supportBlock}
  </div>

  <!-- Footer -->
  <div style="background:#1e293b;color:#94a3b8;padding:28px 32px;text-align:center;font-size:12px;">
    <p style="margin:0 0 4px;font-weight:700;color:#fff;font-size:13px;">${storeName} Showroom</p>
    ${storeAddress ? `<p style="margin:4px 0;">${storeAddress}</p>` : ''}
    ${storeHours ? `<p style="margin:4px 0;">Mở cửa: ${storeHours}</p>` : ''}
    <div style="border-top:1px solid rgba(255,255,255,.1);margin-top:16px;padding-top:12px;font-size:11px;color:#64748b;">
      © 2026 FLYSKY GUITAR
    </div>
  </div>

</div>
</body></html>`;

  return { subject, html };
}

// ─── Hardcoded fallback (kept for direct use) ────────────────────────────────

export function buildOrderConfirmationHtml(params: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingAddress?: string;
  paymentMethod: string;
  totalAmount: number;
  items?: Array<{ name: string; quantity: number; price: number }>;
  note?: string;
}): string {
  const fmt = (n: number) =>
    n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  const paymentLabel: Record<string, string> = {
    bank: 'Chuyển khoản ngân hàng',
    cash: 'Tiền mặt khi nhận hàng',
    installment: 'Trả góp 0%',
  };

  const itemsHtml = params.items && params.items.length > 0
    ? params.items.map(item => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece4;color:#333;">${item.name}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece4;text-align:center;color:#555;">×${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece4;text-align:right;font-weight:600;color:#f48c25;">${fmt(item.price * item.quantity)}</td>
      </tr>`).join('')
    : '';

  return `
<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{font-family:Arial,Helvetica,sans-serif;background:#faf8f5;margin:0;padding:20px;}
  .wrap{max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .header{background:linear-gradient(135deg,#f48c25,#e07010);padding:32px;text-align:center;color:#fff;}
  .header-icon{font-size:48px;margin-bottom:8px;}
  .header h1{margin:0 0 4px;font-size:22px;letter-spacing:.5px;}
  .header p{margin:0;opacity:.85;font-size:13px;}
  .body{padding:28px 32px;}
  .greeting{font-size:15px;color:#444;margin-bottom:20px;line-height:1.6;}
  .info-card{background:#fdf9f4;border:1px solid #f0e4d0;border-radius:10px;padding:18px 22px;margin-bottom:20px;}
  .info-card h2{margin:0 0 12px;font-size:14px;font-weight:700;color:#f48c25;text-transform:uppercase;letter-spacing:.8px;}
  .row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;border-bottom:1px solid #f5efe5;}
  .row:last-child{border-bottom:none;}
  .label{color:#888;}
  .value{font-weight:600;color:#333;text-align:right;max-width:65%;}
  table{width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px;}
  th{text-align:left;font-size:12px;color:#aaa;padding-bottom:8px;border-bottom:2px solid #f0ece4;text-transform:uppercase;letter-spacing:.6px;}
  th:last-child{text-align:right;}
  th:nth-child(2){text-align:center;}
  .total-row{font-size:16px;font-weight:700;color:#f48c25;}
  .payment-badge{display:inline-block;background:#fff3e0;color:#f48c25;border:1px solid #f48c25;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:600;}
  .note-box{background:#fffbf5;border-left:3px solid #f48c25;padding:10px 14px;font-size:13px;color:#555;margin-top:12px;border-radius:0 6px 6px 0;}
  .cta{text-align:center;margin:24px 0;}
  .btn{display:inline-block;background:#f48c25;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:15px;}
  .footer{padding:18px 32px;background:#faf8f5;font-size:12px;color:#bbb;text-align:center;border-top:1px solid #f0ece4;}
  .footer a{color:#f48c25;text-decoration:none;}
</style></head><body>
<div class="wrap">
  <div class="header">
    <div class="header-icon">✅</div>
    <h1>Đặt hàng thành công!</h1>
    <p>FlySky Guitar xác nhận đơn hàng của bạn</p>
  </div>
  <div class="body">
    <p class="greeting">
      Xin chào <strong>${params.customerName}</strong>,<br/>
      Cảm ơn bạn đã tin tưởng FlySky Guitar! Đơn hàng <strong>#${params.orderNumber}</strong> của bạn đã được ghi nhận và đang chờ xử lý.
    </p>

    <div class="info-card">
      <h2>Thông tin đơn hàng</h2>
      <div class="row"><span class="label">Mã đơn hàng</span><span class="value" style="color:#f48c25;">#${params.orderNumber}</span></div>
      <div class="row"><span class="label">Ngày đặt</span><span class="value">${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></div>
      <div class="row"><span class="label">Phương thức thanh toán</span><span class="value"><span class="payment-badge">${paymentLabel[params.paymentMethod] ?? params.paymentMethod}</span></span></div>
      ${params.shippingAddress ? `<div class="row"><span class="label">Địa chỉ giao hàng</span><span class="value">${params.shippingAddress}</span></div>` : ''}
      <div class="row"><span class="label">Số điện thoại</span><span class="value">${params.customerPhone}</span></div>
    </div>

    ${itemsHtml ? `
    <div class="info-card">
      <h2>Sản phẩm đã đặt</h2>
      <table><thead><tr><th>Sản phẩm</th><th>SL</th><th style="text-align:right;">Thành tiền</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot><tr class="total-row"><td colspan="2" style="padding-top:12px;">Tổng thanh toán</td><td style="padding-top:12px;text-align:right;">${fmt(params.totalAmount)}</td></tr></tfoot>
      </table>
    </div>` : `
    <div class="info-card">
      <div class="row"><span class="label">Tổng thanh toán</span><span class="value" style="font-size:18px;color:#f48c25;">${fmt(params.totalAmount)}</span></div>
    </div>`}

    ${params.note ? `<div class="note-box">📝 <strong>Ghi chú:</strong> ${params.note}</div>` : ''}

    ${params.paymentMethod === 'bank' ? `
    <div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:10px;padding:14px 18px;margin-top:16px;font-size:13px;color:#2e7d32;">
      <strong>⏳ Đơn hàng đang chờ thanh toán:</strong> Vui lòng chuyển khoản theo thông tin trên trang thanh toán. Đơn hàng sẽ được xử lý ngay sau khi chúng tôi xác nhận giao dịch.
    </div>` : ''}

    <div class="cta">
      <a href="/" class="btn">🎸 Tiếp tục mua sắm</a>
    </div>
  </div>
  <div class="footer">
    Bạn nhận được email này vì đã đặt hàng tại <a href="/">FlySky Guitar</a>.<br/>
    Cần hỗ trợ? Liên hệ <a href="tel:0987654321">0987 654 321</a> hoặc reply email này.
  </div>
</div>
</body></html>`;
}
