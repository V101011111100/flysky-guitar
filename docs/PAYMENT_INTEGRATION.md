# Hướng dẫn tích hợp thanh toán

## 📋 Tổng quan

Hệ thống hỗ trợ 5 phương thức thanh toán:
1. **Chuyển khoản ngân hàng** (Bank Transfer)
2. **MoMo Wallet**
3. **VietQR**
4. **Stripe** (Thẻ quốc tế)
5. **Tiền mặt** (Cash on Delivery)

## 🗄️ Database Setup

### Bước 1: Chạy migration
```bash
# Chạy file SQL để tạo bảng payment_settings và payment_transactions
psql -U postgres -d flysky < supabase/payment_settings.sql
```

Hoặc trong Supabase Dashboard:
- Vào SQL Editor
- Copy nội dung file `supabase/payment_settings.sql`
- Run query

### Bước 2: Cấu trúc bảng

**payment_settings:**
- `provider`: tên nhà cung cấp (bank_transfer, momo, vietqr, stripe, cash)
- `enabled`: bật/tắt payment method
- `config`: JSON chứa API keys, credentials

**payment_transactions:**
- `order_id`: liên kết với đơn hàng
- `provider`: nhà cung cấp thanh toán
- `transaction_id`: mã giao dịch từ payment gateway
- `status`: pending/completed/failed/refunded
- `metadata`: thông tin bổ sung

## 💳 1. MoMo Integration

### Yêu cầu:
- Đăng ký tài khoản MoMo Business: https://business.momo.vn
- Lấy credentials từ MoMo Developer Portal

### Cấu hình:
```json
{
  "partner_code": "MOMO_PARTNER_CODE",
  "access_key": "YOUR_ACCESS_KEY",
  "secret_key": "YOUR_SECRET_KEY",
  "endpoint": "https://test-payment.momo.vn/v2/gateway/api/create"
}
```

### API Endpoints cần tạo:

**1. `/api/payment/momo/create`** - Tạo payment request
```typescript
// Input: orderId, amount, orderInfo
// Output: payUrl (redirect user đến đây để thanh toán)
```

**2. `/api/payment/momo/callback`** - Nhận kết quả từ MoMo
```typescript
// MoMo sẽ POST kết quả thanh toán về endpoint này
// Verify signature, update order status
```

**3. `/api/payment/momo/ipn`** - IPN (Instant Payment Notification)
```typescript
// Webhook để MoMo thông báo kết quả thanh toán
// Cập nhật payment_transactions table
```

### Flow:
1. User chọn thanh toán MoMo
2. Backend gọi MoMo API tạo payment request
3. Redirect user đến MoMo payment page
4. User thanh toán trên MoMo app
5. MoMo redirect về callback URL + gửi IPN
6. Backend verify signature, cập nhật order status

## 🏦 2. VietQR Integration

### Yêu cầu:
- Tài khoản ngân hàng hỗ trợ VietQR
- Lấy Bank ID từ danh sách: https://api.vietqr.io/v2/banks

### Cấu hình:
```json
{
  "bank_id": "970418",
  "account_no": "1234567890",
  "account_name": "CONG TY TNHH FLYSKY GUITAR",
  "template": "compact"
}
```

### API Endpoints:

**1. `/api/payment/vietqr/generate`** - Tạo QR code
```typescript
// Input: orderId, amount, description
// Output: qrDataURL (base64 image)
// Sử dụng API: https://api.vietqr.io/v2/generate
```

### Flow:
1. User chọn thanh toán VietQR
2. Backend tạo QR code với nội dung: số TK + số tiền + mã đơn hàng
3. Hiển thị QR code cho user
4. User quét mã và chuyển khoản
5. **Manual verification**: Admin check banking app và confirm đơn hàng
6. Hoặc tích hợp Banking API (nâng cao) để auto-verify

### VietQR API Example:
```javascript
const qrData = {
  accountNo: "1234567890",
  accountName: "FLYSKY GUITAR",
  acqId: "970418", // Bank ID
  amount: 1000000,
  addInfo: `DH${orderId}`, // Nội dung chuyển khoản
  format: "text",
  template: "compact"
};

const response = await fetch('https://api.vietqr.io/v2/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(qrData)
});

const { data } = await response.json();
// data.qrDataURL = base64 image
```

## 💰 3. Stripe Integration

### Yêu cầu:
- Đăng ký Stripe: https://stripe.com
- Lấy API keys từ Dashboard

### Cấu hình:
```json
{
  "public_key": "pk_test_...",
  "secret_key": "sk_test_...",
  "webhook_secret": "whsec_..."
}
```

### Setup:
```bash
npm install stripe
```

### API Endpoints:

**1. `/api/payment/stripe/create-intent`** - Tạo Payment Intent
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const paymentIntent = await stripe.paymentIntents.create({
  amount: 1000000, // VND (Stripe tính bằng cents)
  currency: 'vnd',
  metadata: { orderId: 'xxx' }
});

// Return clientSecret to frontend
```

**2. `/api/payment/stripe/webhook`** - Webhook handler
```typescript
// Verify webhook signature
// Handle payment_intent.succeeded event
// Update order status
```

### Frontend Integration:
```javascript
// Sử dụng Stripe Elements
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_test_...');
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'Customer Name' }
  }
});
```

## 🔐 Security Best Practices

1. **Không lưu API keys trong code** - dùng environment variables
2. **Verify signatures** - tất cả webhook/callback phải verify signature
3. **HTTPS only** - payment endpoints phải dùng HTTPS
4. **Log transactions** - lưu tất cả giao dịch vào `payment_transactions`
5. **Idempotency** - xử lý duplicate callbacks

## 📝 Cập nhật Settings Page

Thêm vào `/admin/settings` tab "Thanh toán":

```astro
<!-- VietQR Settings -->
<section class="stg-section">
  <div class="section-head">
    <h3 class="section-title">VietQR</h3>
    <p class="section-desc">Tạo mã QR thanh toán tự động</p>
  </div>
  <div class="form-grid">
    <div class="form-group">
      <label class="form-label">Bank ID</label>
      <input type="text" id="stg-vietqr-bank-id" class="form-input" />
    </div>
    <div class="form-group">
      <label class="form-label">Số tài khoản</label>
      <input type="text" id="stg-vietqr-account" class="form-input" />
    </div>
  </div>
</section>

<!-- Stripe Settings -->
<section class="stg-section">
  <div class="section-head">
    <h3 class="section-title">Stripe</h3>
    <p class="section-desc">Thanh toán thẻ quốc tế</p>
  </div>
  <div class="form-grid">
    <div class="form-group">
      <label class="form-label">Public Key</label>
      <input type="text" id="stg-stripe-public" class="form-input" />
    </div>
    <div class="form-group">
      <label class="form-label">Secret Key</label>
      <input type="password" id="stg-stripe-secret" class="form-input" />
    </div>
  </div>
</section>
```

## 🚀 Roadmap Triển khai

### Phase 1: Database & Settings (Ưu tiên cao)
- [x] Tạo bảng `payment_settings` và `payment_transactions`
- [ ] Cập nhật Settings page với VietQR và Stripe fields
- [ ] API endpoint để lưu/đọc payment settings

### Phase 2: VietQR (Dễ nhất)
- [ ] API tạo QR code
- [ ] Hiển thị QR trên payment page
- [ ] Manual verification workflow

### Phase 3: MoMo (Trung bình)
- [ ] API create payment
- [ ] Callback handler
- [ ] IPN webhook
- [ ] Test với MoMo sandbox

### Phase 4: Stripe (Phức tạp nhất)
- [ ] Install Stripe SDK
- [ ] Payment Intent API
- [ ] Frontend Stripe Elements
- [ ] Webhook handler
- [ ] Test mode

## 📞 Support

- MoMo: https://developers.momo.vn
- VietQR: https://vietqr.io
- Stripe: https://stripe.com/docs

## ⚠️ Lưu ý quan trọng

1. **Test mode trước khi production**: Tất cả payment gateways đều có test/sandbox mode
2. **Webhook URL phải public**: Cần domain thật (không dùng localhost) để nhận webhook
3. **Currency**: MoMo và VietQR chỉ hỗ trợ VND, Stripe hỗ trợ đa tiền tệ
4. **Phí giao dịch**: 
   - MoMo: ~1-2%
   - VietQR: Free (chỉ phí chuyển khoản ngân hàng)
   - Stripe: ~3.4% + phí cố định
