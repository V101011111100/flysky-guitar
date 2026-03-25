# Hướng dẫn thiết lập Push Notifications

## Bước 1: Cài đặt dependencies

Package `web-push` đã được cài đặt sẵn. Nếu cần cài lại:

```bash
npm install web-push
```

## Bước 2: Tạo VAPID Keys

Chạy script để tạo VAPID keys:

```bash
node scripts/generate-vapid-keys.js
```

Script sẽ tạo ra 2 keys:
- **VAPID_PUBLIC_KEY**: Key công khai (có thể chia sẻ)
- **VAPID_PRIVATE_KEY**: Key bí mật (KHÔNG được chia sẻ)

## Bước 3: Cấu hình Environment Variables

Tạo file `.env` (nếu chưa có) và thêm các biến sau:

```env
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
VAPID_SUBJECT=mailto:admin@flyskyguitar.com
```

**Lưu ý**: Thay `your_generated_public_key` và `your_generated_private_key` bằng keys được tạo từ bước 2.

## Bước 4: Tạo bảng trong Supabase

Chạy migration SQL trong Supabase Dashboard hoặc CLI:

```bash
# Nếu dùng Supabase CLI
supabase db push
```

Hoặc copy nội dung file `supabase/migrations/create_push_subscriptions.sql` và chạy trong Supabase SQL Editor.

## Bước 5: Sử dụng Push Notifications

### Bật thông báo đẩy cho Admin

1. Đăng nhập vào Admin Panel
2. Vào **Settings** > **Email & Thông báo**
3. Tìm phần **Thông báo đẩy (Push)**
4. Bật toggle "Thông báo trình duyệt cho Admin"
5. Cho phép thông báo khi trình duyệt yêu cầu

### Gửi thông báo từ code

Sử dụng API endpoint `/api/notifications/send`:

```javascript
const response = await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Đơn hàng mới!',
    body: 'Bạn có đơn hàng mới từ khách hàng',
    url: '/admin/orders/123',
    userId: 'optional-user-id' // Bỏ qua để gửi cho tất cả
  })
});
```

### Tích hợp với sự kiện đơn hàng

Ví dụ gửi thông báo khi có đơn hàng mới:

```javascript
// Trong API tạo đơn hàng
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'FlySky Guitar - Đơn hàng mới',
    body: `Đơn hàng #${orderId} - ${customerName}`,
    url: `/admin/orders/${orderId}`
  })
});
```

## Cấu trúc Files

```
flysky/
├── public/
│   └── sw.js                                    # Service Worker
├── src/
│   └── pages/
│       └── api/
│           └── notifications/
│               ├── subscribe.ts                 # Đăng ký subscription
│               ├── unsubscribe.ts              # Hủy subscription
│               ├── send.ts                     # Gửi notification
│               └── vapid-key.ts                # Lấy public key
├── scripts/
│   └── generate-vapid-keys.js                  # Script tạo VAPID keys
├── supabase/
│   └── migrations/
│       └── create_push_subscriptions.sql       # Database migration
└── .env                                         # Environment variables
```

## Troubleshooting

### Lỗi: "Service Worker registration failed"
- Đảm bảo app đang chạy trên HTTPS hoặc localhost
- Kiểm tra file `public/sw.js` có tồn tại

### Lỗi: "Không thể lấy VAPID key"
- Kiểm tra file `.env` đã có VAPID_PUBLIC_KEY
- Restart dev server sau khi thêm env variables

### Lỗi: "Failed to save subscription"
- Kiểm tra bảng `push_subscriptions` đã được tạo trong Supabase
- Kiểm tra RLS policies đã được enable

### Thông báo không hiển thị
- Kiểm tra quyền thông báo trong browser settings
- Mở DevTools > Application > Service Workers để debug
- Kiểm tra Console logs

## Browser Support

Push Notifications được hỗ trợ trên:
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile, iOS 16.4+)
- ❌ Internet Explorer

## Bảo mật

- **VAPID_PRIVATE_KEY** phải được giữ bí mật
- Không commit file `.env` vào git
- Sử dụng `.env.example` để chia sẻ cấu trúc
- RLS policies đảm bảo users chỉ quản lý được subscriptions của mình
