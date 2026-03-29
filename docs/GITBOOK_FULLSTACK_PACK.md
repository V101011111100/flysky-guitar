# FlySky GitBook Full Pack (Admin + Nhan vien)

## 1. Tong quan pham vi tai lieu

### Muc tieu
- Tao bo tai lieu van hanh va su dung he thong FlySky cho 2 nhom: Admin va Nhan vien.
- Bao phu fullstack: frontend, admin, API-backed behavior, va quy trinh van hanh.
- Toi uu cho thao tac thuc te: co SOP, checklist, troubleshooting.

### Pham vi chuc nang (xac nhan theo codebase)

#### Frontend khach hang
- Trang chu: Hero, Featured Collections, Best Sellers, Brand Story.
- Shop: loc theo danh muc, sap xep, xem chi tiet san pham.
- Product detail: gallery, video demo, review, them gio.
- Cart: thong tin lien he, chon thanh toan, ap ma giam gia client-side, gui don.
- Payment: VietQR/chuyen khoan, MoMo (beta), Visa/Master (dang tich hop).
- Order success: hien thong tin don theo session browser.
- Contact: form va kenh social/widget chat.
- Blog: danh sach va chi tiet bai viet cong khai.
- Search: da co trang tim kiem (du lieu hien tai o muc mock).
- Floating widgets: Zalo/Facebook/WhatsApp/Instagram + quick chat.

#### Admin backoffice
- Dashboard tong quan.
- Products: tao/sua, media, thong so, video.
- Orders: loc, cap nhat trang thai, export.
- Inventory: import/export Excel, xoa, theo doi ton.
- Shipping: providers, rates, tracking, dashboard.
- Consultations/Khach hang: gom theo SDT, note, chuan hoa ten.
- Reviews: duyet/xoa/seed.
- Media: R2 + Supabase Storage.
- Blog CMS.
- Newsletter editor/templates.
- SEO & Marketing.
- Discounts.
- POS + hoa don + bao cao POS.
- Permissions (phan quyen theo module + users).
- Activity log + export.
- Settings: general/appearance/payment/email-notifications/security/sessions/MFA/push/maintenance.

#### API-backed behavior quan trong
- Contact submit.
- Newsletter subscribe.
- Orders create/update/export/by-phone.
- Products save/import/export/upload/quick-update/delete.
- Media list/upload/delete (R2 + Supabase Storage).
- Settings update/bulk-update + payment-settings.
- Push notifications subscribe/unsubscribe/send/test + vapid-key.
- Shipping dashboard/providers/trackings.
- Auth/session/MFA/signout/change-password.
- Reviews submit + admin action.
- Blog list/post.
- Templates/get-templates.

#### Van hanh he thong
- Maintenance mode.
- Settings hydration tu site_settings ra giao dien public.
- Session quan tri, logout-all, terminate session.
- Nhat ky hoat dong va xuat bao cao.
- Email test/send va template email.

---

## 2. Role matrix (Admin / Nhan vien)

### Nguyen tac
- Admin: full quyen tat ca module, quan ly cau hinh he thong.
- Nhan vien: quyen theo module duoc cap trong Permissions.

### Ma tran quyen de xuat
- Dashboard:
  - Admin: toan quyen.
  - Nhan vien: xem neu duoc cap quyen.
- San pham/Kho:
  - Admin: them/sua/xoa/import/export/cap nhat nhanh.
  - Nhan vien: theo quyen products + inventory.
- Don hang/Van chuyen/POS:
  - Admin: toan quyen tao/cap nhat/doi soat.
  - Nhan vien: theo quyen orders/shipping/pos.
- Consultations:
  - Admin: toan quyen quan ly khach hang.
  - Nhan vien: theo quyen consultations.
- Reviews/Blog/SEO/Newsletter/Media:
  - Admin: toan quyen duyet noi dung va campaign.
  - Nhan vien: theo quyen module tuong ung.
- Permissions/Activity Log/Settings Security:
  - Admin: toan quyen.
  - Nhan vien: thuong chi tai khoan ca nhan neu duoc cap.

---

## 3. Muc luc GitBook de xuat (cap 1/cap 2)

### 01. Gioi thieu he thong
- 1.1 Tong quan FlySky Platform
- 1.2 Vai tro va pham vi su dung
- 1.3 So do luong nghiep vu tong quat

### 02. Huong dan cho Nhan vien (van hanh hang ngay)
- 2.1 Xu ly don hang tu A-Z
- 2.2 Van hanh kho (kiem ton, import/export)
- 2.3 Van chuyen va cap nhat tracking
- 2.4 Tiep nhan khach hang/consultation
- 2.5 Duyet review va xu ly phan hoi
- 2.6 Van hanh POS tai quay

### 03. Huong dan cho Admin
- 3.1 Dashboard va KPI
- 3.2 Quan ly san pham va media
- 3.3 Quan ly don hang nang cao
- 3.4 Marketing: discounts, SEO, newsletter
- 3.5 Blog va noi dung thuong hieu
- 3.6 Phan quyen tai khoan va users
- 3.7 Bao mat: MFA, sessions, doi mat khau
- 3.8 Nhat ky hoat dong va kiem toan

### 04. Huong dan frontend (khach hang)
- 4.1 Trang chu va settings hydration
- 4.2 Shop va Product Detail
- 4.3 Cart -> Payment -> Order Success
- 4.4 Contact va Floating Widgets
- 4.5 Blog cong khai

### 05. API va tich hop van hanh
- 5.1 Contact/Newsletter APIs
- 5.2 Orders/Products/Inventory APIs
- 5.3 Media/Upload APIs (R2 + Supabase Storage)
- 5.4 Settings/Payment-Settings APIs
- 5.5 Push Notifications APIs
- 5.6 Shipping APIs
- 5.7 Auth/Session/MFA APIs

### 06. SOP van hanh
- 6.1 SOP theo ca lam viec
- 6.2 SOP xu ly su co
- 6.3 SOP doi soat cuoi ngay

### 07. Troubleshooting va FAQ
- 7.1 Loi thuong gap theo module
- 7.2 Tinh huong mat dong bo du lieu
- 7.3 Checklist an toan truoc release

---

## 4. Backlog chapter theo uu tien P0/P1/P2

### P0 (bat buoc truoc Dot 1)
1. Dang nhap admin, MFA, session, phan quyen.
2. Don hang full flow: cart -> tao don -> payment -> order-success -> cap nhat trang thai.
3. San pham + kho: tao/sua, import/export, stock.
4. Van chuyen: provider, tracking, dashboard.
5. Media + upload (R2/Supabase).
6. Contact/newsletter APIs + tiep nhan lead.
7. Settings hydration + maintenance mode.
8. Checklist van hanh ngay/tuan/thang.

### P1 (Dot 2)
1. Reviews + consultations.
2. Discounts + SEO/marketing + newsletter editor.
3. POS + hoa don + bao cao POS.
4. Activity log + export bao cao.
5. Blog CMS + quy trinh bien tap/duyet.

### P2 (Dot 3)
1. Bao cao KPI nang cao.
2. Playbook su co nang cao (push/email/shipping).
3. Governance noi dung + release checklist chi tiet.
4. FAQ nang cao theo tung role.

---

## 5. Roadmap ban giao tai lieu (Dot 1/2/3)

### Dot 1 - Van hanh cot loi
- Ban giao core SOP cho Admin + Nhan vien: don hang, kho, shipping, settings, security.
- Ban giao chapter frontend flow de CSKH nam hanh trinh khach.
- Ban giao appendix API quan trong de doi soat van hanh.

### Dot 2 - Toi uu tac nghiep
- Ban giao modules: marketing, reviews, consultations, POS, activity logs.
- Them runbook xu ly loi theo tinh huong.
- Chuan hoa template thao tac va bieu mau van hanh.

### Dot 3 - Hoan thien mo rong
- Ban giao chapter KPI, governance, FAQ nang cao.
- Dong bo phan quyen theo chuc danh.
- Chot phien ban production-ready kem checklist duyet noi bo.

---

## 6. Checklist van hanh Ngay/Tuan/Thang

### Hang ngay
1. Kiem tra don moi pending, cap nhat theo SLA.
2. Kiem tra ton kho thap, canh bao out_of_stock.
3. Kiem tra tracking van don va don bi tre.
4. Kiem tra lead moi tu contact/widget + newsletter.
5. Kiem tra media upload loi, link anh hong.
6. Kiem tra push notification test nhanh dau ca.
7. Kiem tra activity log bat thuong.

### Hang tuan
1. Doi soat doanh thu - don hang - ton kho.
2. Ra soat ma giam gia dang chay/het han.
3. Duyet review ton dong va chat luong phan hoi.
4. Kiem tra template newsletter/email va test gui.
5. Ra soat tai khoan nhan vien, thu hoi quyen du thua.
6. Kiem tra blog/SEO can cap nhat.

### Hang thang
1. Tong hop KPI doanh thu, don hang, ti le hoan tat.
2. Ra soat bao mat: mat khau, MFA, sessions dang hoat dong.
3. Danh gia hieu qua kenh marketing.
4. Kiem tra dung luong media/storage va don dep.
5. Cap nhat SOP theo su co phat sinh.
6. Chay release gate/maintenance checklist noi bo.

---

## 7. Thong tin con thieu can bo sung

1. Mapping phan quyen chinh thuc theo chuc danh.
2. SLA cho tung cong doan (xac nhan don, giao van, phan hoi contact).
3. Quy uoc trang thai don hang theo tung team.
4. Quy trinh doi soat chuyen khoan voi sao ke.
5. Fallback khi MoMo/Visa gap loi.
6. Chuan taxonomy danh muc cho import Excel.
7. Chinh sach quan tri noi dung blog/SEO (nguoi duyet, tan suat).
8. Quy trinh su co push notifications (vapid key rotation, test dinh ky).
9. Mau van ban CSKH cho contact widget va order-success email.
10. Xac nhan production scope cho Search (hien du lieu dang mock).
11. Xac nhan Contact form chinh la UI-only hay se submit API.
12. Chinh sach luu tru media: retention, backup, dọn dep dinh ky.

---

## Huong dan su dung tai lieu nay tren GitBook

- Co the copy nguyen file nay vao mot page goc: `Project Documentation`.
- Sau do tach thanh cac page con theo Muc 3 (01 -> 07).
- Uu tien viet truoc cac chapter P0 truoc khi onboard van hanh.
