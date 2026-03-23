# Hướng dẫn tích hợp Email & Vận chuyển

## 📧 EMAIL INTEGRATION

### 1. SMTP (Gmail hoặc bất kỳ email server nào)

#### Cấu hình Gmail SMTP
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "your-email@gmail.com",
    "pass": "app-password-here"
  },
  "from_email": "your-email@gmail.com",
  "from_name": "FlySky Guitar"
}
```

**Lấy App Password từ Gmail:**
1. Vào https://myaccount.google.com/security
2. Bật "2-Step Verification"
3. Vào "App passwords"
4. Tạo password mới cho "Mail"
5. Copy password 16 ký tự (không có khoảng trắng)

#### Cấu hình SMTP Server khác
```json
{
  "host": "mail.yourdomain.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "noreply@yourdomain.com",
    "pass": "your-password"
  },
  "from_email": "noreply@yourdomain.com",
  "from_name": "FlySky Guitar"
}
```

### 2. SendGrid (Khuyên dùng cho production)

**Đăng ký:** https://sendgrid.com (Free 100 emails/day)

```json
{
  "api_key": "SG.xxxxxxxxxxxxxx",
  "from_email": "noreply@flysky.com",
  "from_name": "FlySky Guitar"
}
```

### 3. Resend (Modern, dễ dùng)

**Đăng ký:** https://resend.com (Free 3000 emails/month)

```json
{
  "api_key": "re_xxxxxxxxxxxxxx",
  "from_email": "noreply@flysky.com",
  "from_name": "FlySky Guitar"
}
```

### API Endpoints cần tạo

**1. `/api/email/send`** - Gửi email
```typescript
import nodemailer from 'nodemailer';

export const POST: APIRoute = async ({ request }) => {
  const { to, subject, template_key, variables } = await request.json();
  
  // Get email settings from database
  const { data: settings } = await supabase
    .from('email_settings')
    .select('*')
    .eq('enabled', true)
    .single();
  
  // Get template
  const { data: template } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_key', template_key)
    .single();
  
  // Replace variables in template
  let html = template.body_html;
  Object.keys(variables).forEach(key => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
  });
  
  // Send email based on provider
  if (settings.provider === 'smtp') {
    const transporter = nodemailer.createTransport(settings.config);
    await transporter.sendMail({
      from: `${settings.config.from_name} <${settings.config.from_email}>`,
      to,
      subject: template.subject.replace(/{{(\w+)}}/g, (_, key) => variables[key]),
      html
    });
  }
  
  // Log email
  await supabase.from('email_logs').insert({
    recipient: to,
    subject: template.subject,
    template_key,
    provider: settings.provider,
    status: 'sent'
  });
  
  return new Response(JSON.stringify({ success: true }));
};
```

**2. `/api/email/test`** - Test email configuration
```typescript
// Send test email to verify settings
```

### Email Templates

Hệ thống có sẵn 3 templates:
- `order_confirmation`: Xác nhận đơn hàng
- `order_shipped`: Thông báo đã giao vận chuyển
- `order_delivered`: Thông báo đã giao hàng

**Tạo template mới:**
```sql
INSERT INTO email_templates (template_key, subject, body_html, variables)
VALUES (
  'password_reset',
  'Đặt lại mật khẩu - FlySky Guitar',
  '<h1>Đặt lại mật khẩu</h1><p>Click vào link: {{reset_link}}</p>',
  '["reset_link", "customer_name"]'::jsonb
);
```

---

## 🚚 SHIPPING INTEGRATION

### 1. Giao Hàng Tiết Kiệm (GHTK)

**Đăng ký:** https://khachhang.giaohangtietkiem.vn/

**Cấu hình:**
```json
{
  "api_token": "your-api-token-here",
  "api_url": "https://services.giaohangtietkiem.vn",
  "shop_id": "123456",
  "pick_address": {
    "province": "Hà Nội",
    "district": "Hoàn Kiếm",
    "ward": "Hàng Bạc",
    "address": "123 Hàng Bạc"
  }
}
```

**API Endpoints:**

**1. `/api/shipping/ghtk/calculate-fee`** - Tính phí vận chuyển
```typescript
const response = await fetch('https://services.giaohangtietkiem.vn/services/shipment/fee', {
  method: 'GET',
  headers: {
    'Token': config.api_token
  },
  params: {
    pick_province: 'Hà Nội',
    pick_district: 'Hoàn Kiếm',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    weight: 1000, // gram
    value: 1000000 // VND
  }
});

const { fee } = await response.json();
```

**2. `/api/shipping/ghtk/create-order`** - Tạo đơn vận chuyển
```typescript
const order = {
  products: [
    {
      name: 'Guitar Acoustic',
      weight: 2000,
      quantity: 1,
      price: 5000000
    }
  ],
  order: {
    id: orderId,
    pick_name: 'FlySky Guitar',
    pick_address: config.pick_address.address,
    pick_province: config.pick_address.province,
    pick_district: config.pick_address.district,
    pick_ward: config.pick_address.ward,
    pick_tel: '0123456789',
    tel: customerPhone,
    name: customerName,
    address: shippingAddress,
    province: customerProvince,
    district: customerDistrict,
    ward: customerWard,
    is_freeship: 0,
    pick_money: totalAmount,
    note: orderNote
  }
};

const response = await fetch('https://services.giaohangtietkiem.vn/services/shipment/order', {
  method: 'POST',
  headers: {
    'Token': config.api_token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(order)
});

const { order: { tracking_id } } = await response.json();

// Save tracking to database
await supabase.from('shipping_trackings').insert({
  order_id: orderId,
  provider_code: 'ghtk',
  tracking_number: tracking_id,
  status: 'pending'
});
```

**3. `/api/shipping/ghtk/webhook`** - Nhận cập nhật trạng thái
```typescript
export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  
  // Update tracking status
  await supabase
    .from('shipping_trackings')
    .update({
      status: mapGHTKStatus(data.status),
      current_location: data.current_location,
      updated_at: new Date().toISOString()
    })
    .eq('tracking_number', data.label_id);
  
  // Send email notification if delivered
  if (data.status === 'delivered') {
    // Send email...
  }
  
  return new Response(JSON.stringify({ success: true }));
};
```

### 2. Giao Hàng Nhanh (GHN)

**Đăng ký:** https://sso.ghn.vn/

**Cấu hình:**
```json
{
  "api_token": "your-token-here",
  "api_url": "https://dev-online-gateway.ghn.vn",
  "shop_id": "123456",
  "from_district_id": "1442"
}
```

**API tương tự GHTK:**
- Calculate fee: `POST /shiip/public-api/v2/shipping-order/fee`
- Create order: `POST /shiip/public-api/v2/shipping-order/create`
- Get tracking: `POST /shiip/public-api/v2/shipping-order/detail`

### 3. Viettel Post

**Đăng ký:** https://viettelpost.com.vn/

**Cấu hình:**
```json
{
  "username": "your-username",
  "password": "your-password",
  "api_url": "https://partner.viettelpost.vn/v2",
  "customer_id": "123456",
  "sender_phone": "0123456789",
  "sender_address": "123 Hàng Bạc, Hoàn Kiếm, Hà Nội"
}
```

**Login để lấy token:**
```typescript
const response = await fetch('https://partner.viettelpost.vn/v2/user/Login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    USERNAME: config.username,
    PASSWORD: config.password
  })
});

const { data: { token } } = await response.json();
```

### 4. Tự giao hàng (Self Delivery)

Không cần API, chỉ cần:
- Cấu hình phí ship trong `shipping_rates`
- Admin tự quản lý việc giao hàng
- Cập nhật trạng thái manual

---

## 🗄️ Database Functions

### Tính phí ship
```sql
SELECT calculate_shipping_fee(
  'ghtk',           -- provider_code
  'Hà Nội',         -- from_province
  'TP. HCM',        -- to_province
  3.5               -- weight (kg)
);
```

### Log email
```sql
SELECT log_email(
  'customer@email.com',     -- recipient
  'Xác nhận đơn hàng',      -- subject
  'order_confirmation',     -- template_key
  'smtp',                   -- provider
  'sent'                    -- status
);
```

---

## 📋 Checklist Triển khai

### Email Setup
- [ ] Chạy migration `email_and_shipping_settings.sql`
- [ ] Cấu hình SMTP/Gmail trong Settings page
- [ ] Test gửi email
- [ ] Tạo API endpoint `/api/email/send`
- [ ] Tích hợp vào flow đặt hàng

### Shipping Setup
- [ ] Đăng ký tài khoản GHTK/GHN/Viettel Post
- [ ] Lấy API credentials
- [ ] Cấu hình trong Settings page
- [ ] Tạo API endpoints:
  - `/api/shipping/calculate-fee`
  - `/api/shipping/create-order`
  - `/api/shipping/webhook`
- [ ] Test tạo đơn vận chuyển
- [ ] Setup webhook URLs

### Integration Points

**Khi khách đặt hàng:**
1. Tính phí ship → hiển thị cho khách
2. Tạo order trong database
3. Gửi email xác nhận → `order_confirmation`

**Khi admin xác nhận đơn:**
1. Gọi API shipping provider tạo đơn vận chuyển
2. Lưu tracking number vào `shipping_trackings`
3. Gửi email thông báo → `order_shipped`

**Khi nhận webhook từ shipping:**
1. Cập nhật status trong `shipping_trackings`
2. Nếu delivered → gửi email `order_delivered`

---

## 🔒 Security

1. **API Keys:** Lưu trong database, không commit vào git
2. **Webhook:** Verify signature từ shipping providers
3. **Email:** Không gửi quá 100 emails/hour (tránh spam)
4. **Rate limiting:** Giới hạn API calls

---

## 💰 Chi phí

### Email
- Gmail SMTP: Free (500 emails/day)
- SendGrid: Free (100 emails/day), $15/month (40k emails)
- Resend: Free (3000 emails/month), $20/month (50k emails)

### Shipping
- GHTK: ~15,000-30,000đ/đơn nội thành, ~30,000-50,000đ liên tỉnh
- GHN: Tương tự GHTK
- Viettel Post: ~20,000-40,000đ
- Tự giao: Tùy cấu hình

---

## 📞 Support

- GHTK: https://khachhang.giaohangtietkiem.vn/
- GHN: https://sso.ghn.vn/
- Viettel Post: https://viettelpost.com.vn/
- SendGrid: https://sendgrid.com/
- Resend: https://resend.com/
