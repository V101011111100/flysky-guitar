# Hướng dẫn Setup Email Integration

## 📋 Checklist

- [ ] Chạy migration SQL
- [ ] Install nodemailer package
- [ ] Cấu hình Gmail App Password
- [ ] Test gửi email
- [ ] Tích hợp vào order flow

## 🗄️ Bước 1: Chạy Database Migration

Vào Supabase Dashboard → SQL Editor, chạy file:
```sql
-- Copy nội dung từ: supabase/email_and_shipping_settings.sql
```

Hoặc nếu dùng CLI:
```bash
supabase db push
```

## 📦 Bước 2: Install Dependencies

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## 🔑 Bước 3: Lấy Gmail App Password

1. Vào https://myaccount.google.com/security
2. Bật **2-Step Verification** (nếu chưa bật)
3. Vào **App passwords**: https://myaccount.google.com/apppasswords
4. Chọn app: **Mail**
5. Chọn device: **Other** → nhập "FlySky Guitar"
6. Click **Generate**
7. Copy password 16 ký tự (không có khoảng trắng)

## ⚙️ Bước 4: Cấu hình trong Admin Settings

1. Vào `/admin/settings`
2. Click tab **Email**
3. Điền thông tin:
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587`
   - **Email gửi đi**: `your-email@gmail.com`
   - **Mật khẩu ứng dụng**: Paste App Password từ bước 3
   - **Tên người gửi**: `FlySky Guitar`
4. Click **Lưu thay đổi**

## 🧪 Bước 5: Test Email

1. Trong tab Email, phần "Kiểm tra kết nối"
2. Nhập email của bạn vào ô "Email nhận thử nghiệm"
3. Click **Gửi email test**
4. Kiểm tra inbox (và spam folder)

**Email test sẽ có:**
- Subject: "Xác nhận đơn hàng #TEST-001"
- Content: Template mẫu với thông tin test

## 🔗 Bước 6: Tích hợp vào Order Flow

### Gửi email khi tạo đơn hàng mới

Thêm vào file `/api/orders/create.ts` (hoặc tương tự):

```typescript
// Sau khi tạo order thành công
const { data: order } = await supabase
  .from('orders')
  .insert({ ... })
  .select()
  .single();

// Gửi email xác nhận
await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: order.customer_email,
    template_key: 'order_confirmation',
    variables: {
      order_number: order.order_number,
      total_amount: new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(order.total_amount),
      customer_name: order.customer_name,
      items: order.items.map(i => i.name).join(', ')
    }
  })
});
```

### Gửi email khi đơn hàng được giao vận chuyển

```typescript
await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: order.customer_email,
    template_key: 'order_shipped',
    variables: {
      order_number: order.order_number,
      tracking_number: tracking.tracking_number,
      shipping_provider: 'Giao Hàng Tiết Kiệm'
    }
  })
});
```

## 📧 Email Templates Có Sẵn

Hệ thống có 3 templates mặc định:

1. **order_confirmation** - Xác nhận đơn hàng
   - Variables: `order_number`, `total_amount`, `customer_name`, `items`

2. **order_shipped** - Thông báo đã giao vận chuyển
   - Variables: `order_number`, `tracking_number`, `shipping_provider`

3. **order_delivered** - Thông báo đã giao hàng
   - Variables: `order_number`, `customer_name`

## 🎨 Tùy chỉnh Email Templates

Vào Supabase Dashboard → Table Editor → `email_templates`:

```sql
UPDATE email_templates
SET body_html = '<h1>Custom HTML here</h1><p>{{order_number}}</p>'
WHERE template_key = 'order_confirmation';
```

## 🔧 Troubleshooting

### Lỗi: "Invalid login: 535-5.7.8 Username and Password not accepted"
- Kiểm tra đã bật 2FA chưa
- Đảm bảo dùng App Password, không phải password Gmail thường
- Thử tạo App Password mới

### Lỗi: "Connection timeout"
- Kiểm tra port: 587 (TLS) hoặc 465 (SSL)
- Kiểm tra firewall/antivirus
- Thử đổi sang port khác

### Email vào Spam
- Thêm SPF record cho domain
- Xác thực DKIM
- Dùng email service chuyên nghiệp (SendGrid/Resend) cho production

### Lỗi: "Cannot find module 'nodemailer'"
```bash
npm install nodemailer @types/nodemailer
```

## 🚀 Production Tips

1. **Không dùng Gmail cho production** - giới hạn 500 emails/day
2. **Chuyển sang SendGrid hoặc Resend**:
   - SendGrid: Free 100 emails/day, $15/month cho 40k emails
   - Resend: Free 3000 emails/month, $20/month cho 50k emails
3. **Setup email queue** - tránh block khi gửi nhiều email cùng lúc
4. **Monitor email logs** - check bảng `email_logs` thường xuyên

## 📊 Monitoring

Xem email logs:
```sql
SELECT * FROM email_logs
ORDER BY created_at DESC
LIMIT 50;
```

Thống kê:
```sql
SELECT 
  status,
  COUNT(*) as count,
  DATE(created_at) as date
FROM email_logs
GROUP BY status, DATE(created_at)
ORDER BY date DESC;
```

## 🎯 Next Steps

Sau khi email hoạt động:
1. Tích hợp vào checkout flow
2. Gửi email cho admin khi có đơn mới
3. Setup email templates cho password reset, welcome email
4. Thêm email subscription cho newsletter
