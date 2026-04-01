# Hướng dẫn Test API Viettel Post - Quick Start

## 📝 Bước 1: Chuẩn bị thông tin
Lấy từ màn hình Viettel Post của bạn:
- **API URL**: `https://partner.viettelpost.vn/v2`
- **Username**: `0358550527` (hoặc của bạn)
- **Password**: Đã được lưu
- **Customer ID**: `7509506`
- **Token**: Đã xanh (có rồi!)

---

## 🔐 Test 1: Verify Token (Nếu chưa test lần nào)

**Endpoint**: `POST /user/Login`

**Request**:
```bash
curl -X POST https://partner.viettelpost.vn/v2/user/Login \
  -H "Content-Type: application/json" \
  -d '{
    "USERNAME": "0358550527",
    "PASSWORD": "your-password"
  }'
```

**Response (Nếu OK)**:
```json
{
  "status": 200,
  "error": false,
  "message": "OK",
  "data": {
    "userId": 1456467,
    "token": "eyJhbGc...",
    "partner": 722,
    "phone": "0366899133",
    "expired": 0,
    "encrypted": null,
    "source": 5
  }
}
```

**Dấu hiệu kết nối thành công**: 
- ✅ Status = 200
- ✅ error = false
- ✅ Có token

---

## 🗂️ Test 2: Lấy danh sách địa điểm giao hàng

**Endpoint**: `GET /user/listInventory`

**Request**:
```bash
curl -X GET https://partner.viettelpost.vn/v2/user/listInventory \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (OK)**:
```json
{
  "status": 200,
  "data": [
    {
      "groupaddressId": 5818802,
      "cusId": 1456467,
      "name": "Luân Test 2",
      "phone": "0968626207",
      "address": "61 K2 Cầu Diễn",
      "provinceId": 1,
      "districtId": 25,
      "wardsId": 493
    }
  ]
}
```

**Dấu hiệu thành công**:
- ✅ Status = 200
- ✅ Có danh sách địa điểm (groupaddressId)
- ✅ Có thông tin địa chỉ, phone, địa bàn

---

## 💰 Test 3: Tính phí giao hàng

**Endpoint**: `POST /order/calculateFee`

**Request**:
```bash
curl -X POST https://partner.viettelpost.vn/v2/order/calculateFee \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "SENDER_PROVINCE": 1,
    "RECEIVER_PROVINCE": 2,
    "WEIGHT": 0.5,
    "SERVICE_ID": 100,
    "MONEY_COLLECTION": 0,
    "MONEY_INSURANCE": 100000
  }'
```

**Response (OK)**:
```json
{
  "status": 200,
  "error": false,
  "message": "OK",
  "data": {
    "MONEY_COLLECTION": 0,
    "EXCHANGE_WEIGHT": 500,
    "MONEY_TOTAL": 40970,
    "MONEY_TOTAL_FEE": 40970,
    "MONEY_FEE": 7230,
    "MONEY_COLLECTION_FEE": 12750,
    "MONEY_OTHER_FEE": 0,
    "MONEY_VAS": 0,
    "MONEY_VAT": 6095,
    "KPI_HT": 12,
    "KPI_VC": 12
  }
}
```

**Dấu hiệu thành công**:
- ✅ Status = 200
- ✅ Có MONEY_TOTAL (tổng phí)
- ✅ Có MONEY_FEE (phí cơ bản)

---

## 📦 Test 4: TẠO VẬN ĐƠN (The Ultimate Test!)

**Endpoint**: `POST /order/createOrder`

**Request** (Example):
```bash
curl -X POST https://partner.viettelpost.vn/v2/order/createOrder \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ORDER_NUMBER": "TEST-20260401-001",
    "GROUPADDRESS_ID": 5818802,
    "CUS_ID": 1456467,
    "DELIVERY_DATE": "2026-04-01",
    "SENDER_FULLNAME": "FlySky Guitar",
    "SENDER_ADDRESS": "123 Hàng Bạc",
    "SENDER_PHONE": "0123456789",
    "SENDER_EMAIL": "shop@flysky.com",
    "SENDER_WARD": 0,
    "SENDER_DISTRICT": 4,
    "SENDER_PROVINCE": 1,
    "SENDER_LATITUDE": 0,
    "SENDER_LONGITUDE": 0,
    "RECEIVER_FULLNAME": "Khách Test",
    "RECEIVER_ADDRESS": "456 Nguyễn Hữu Cảnh",
    "RECEIVER_PHONE": "0987654321",
    "RECEIVER_EMAIL": "khach@test.com",
    "RECEIVER_WARD": 79,
    "RECEIVER_DISTRICT": 25,
    "RECEIVER_PROVINCE": 2,
    "RECEIVER_LATITUDE": 0,
    "RECEIVER_LONGITUDE": 0,
    "PRODUCT_NAME": "Guitar String Set",
    "PRODUCT_PRICE": 100000,
    "PRODUCT_WEIGHT": 0.5,
    "PRODUCT_TYPE": 1,
    "CONTENT": "Dây đàn guitar",
    "NOTE": "Giao hàng cẩn thận",
    "MONEY_COLLECTION": 0,
    "MONEY_COLLECTION_FEE": 0,
    "SERVICE_ID": 100,
    "ORDER_SERVICE": 1
  }'
```

**Response (Nếu tạo thành công)**:
```json
{
  "status": 200,
  "error": false,
  "message": "OK",
  "data": {
    "ORDER_NUMBER": "1023148636360",
    "MONEY_COLLECTION": 56827,
    "EXCHANGE_WEIGHT": 10000,
    "MONEY_TOTAL": 67045,
    "MONEY_TOTAL_FEE": 40970,
    "MONEY_FEE": 7230,
    "MONEY_COLLECTION_FEE": 12750,
    "MONEY_OTHER_FEE": 0,
    "MONEY_VAS": null,
    "MONEY_VAT": 6095,
    "KPI_HT": 12
  }
}
```

**🎯 Dấu hiệu API kết nối thành công 100%**:
- ✅ Status = 200
- ✅ error = false
- ✅ Có ORDER_NUMBER (mã vận đơn bên Viettel)
- ✅ Có MONEY_TOTAL (tính phí chính xác)
- ✅ Lưu được vào database hệ thống

---

## 🔄 Test 5: Kiểm tra trạng thái vận đơn

**Endpoint**: `GET /order/getOrderStatus?orderNumber=ORDER_ID`

**Request**:
```bash
curl -X GET "https://partner.viettelpost.vn/v2/order/getOrderStatus?orderNumber=1023148636360" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "status": 200,
  "data": {
    "ORDER_ID": 1023148636360,
    "STATUS": "picking",
    "UPDATE_DATE": "2026-04-01 10:30:00"
  }
}
```

---

## 🚀 Chạy Test Tự động

Mình đã chuẩn bị file test script sẵn: **test-viettel-post.js**

**Cách chạy**:

### 1️⃣ Nếu đã có Token:
```bash
# Chỉnh sửa file nhanh bằng CLI
node test-viettel-post.js
```

### 2️⃣ Nếu cần login lại:
Mở file `test-viettel-post.js`, tìm section GIÁ TRỊ CẤU HÌNH:
```javascript
const CONFIG = {
  username: "0358550527",      // Điền của bạn
  password: "your-password",   // Điền của bạn
  customer_id: "7509506",      // Điền của bạn
  token: null,                 // Để null nếu muốn auto-login
};
```

Rồi chạy:
```bash
node test-viettel-post.js
```

**Output sẽ hiển thị**:
```
╔══════════════════════════════════════════════════════════╗
║     VIETTEL POST API - COMPLETE TEST SUITE               ║
├══════════════════════════════════════════════════════════┤
║ 1️⃣  LOGIN ✅
║ 2️⃣  GET PROVINCES ✅
║ 3️⃣  GET DISTRICTS ✅
║ 4️⃣  GET INVENTORY ✅
║ 5️⃣  CALCULATE FEE ✅
║ 6️⃣  CREATE ORDER ✅
║ 7️⃣  CHECK STATUS ✅
╚══════════════════════════════════════════════════════════╝
```

---

## ❌ Nếu bị lỗi - Debug bằng cách này

| Lỗi | Nguyên nhân | Cách fix |
|-----|-----------|---------|
| **Status 401** | Token hết hạn hoặc sai | Login lại hoặc check token |
| **Status 403** | Không có quyền API | Kiểm tra tài khoản Viettel Post |
| **Status 404** | Endpoint sai / Server Viettel down | Kiểm tra URL endpoint |
| **Timeout** | IP bị chặn hoặc mạng kém | Check firewall, IP whitelist |
| **Sai số province/district** | Mã tỉnh huyện không hợp lệ | Lấy từ listProvinceByCId |

---

## 📋 Checklist "Kết nối thành công thật sự"

- [ ] ✅ Login trả về token (Status 200)
- [ ] ✅ Lấy được danh sách địa điểm (Inventory OKay)
- [ ] ✅ Tính phí ship đúng & hiển thị giá tiền
- [ ] ✅ Tạo vận đơn test thành công (nhận ORDER_NUMBER)
- [ ] ✅ Lưu được tracking số vào database
- [ ] ✅ Kiểm tra trạng thái vận đơn (picking/delivering)
- [ ] ✅ Nhận callback webhook từ Viettel (nếu setup rồi)

---

## 🎁 Tips & Tricks

1. **Token hết hạn**: Viettel Post token thường hết sau 1 ngày → cần tạo mechanism auto-refresh
2. **Test order**: Dùng prefix "TEST-" để dé tránh nhầm với order thật
3. **Mock webhook**: Nếu chưa nhận callback, dùng Postman call thửhaha `/api/shipping/webhook` 
4. **Giữ logs**: Log tất cả gọi API → dễ debug sau
5. **Rate limit**: Viettel Post có thể giới hạn requests/phút → check rate limit

---

## 📞 Reference

- **API Base**: https://partner.viettelpost.vn/v2
- **Auth Header**: `Authorization: Bearer <TOKEN>`
- **Main Endpoints**:
  - POST `/user/Login` - Lấy token
  - GET `/user/listInventory` - Danh sách điểm giao
  - GET `/categories/listProvinceByCId` - Danh sách tỉnh
  - GET `/categories/listDistrictByCounty` - Danh sách huyện
  - POST `/order/createOrder` - Tạo vận đơn
  - POST `/order/calculateFee` - Tính phí
  - GET `/order/getOrderStatus` - Kiểm tra trạng thái
  - POST `/user/webhook` - Nhận callback
