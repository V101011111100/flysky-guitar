# P1-03 POS và Activity Log

## Mục tiêu
Chuẩn hóa bán hàng tại quầy, giảm sai sót hóa đơn và tăng khả năng truy vết thao tác quan trọng.

## Đối tượng áp dụng
- Nhân viên bán hàng tại quầy.
- Quản lý ca.
- Admin hoặc quản lý vận hành.

## Điều kiện tiên quyết
- Có quyền truy cập POS và Activity Log.
- Có quy trình mở ca, đóng ca và bàn giao ca.

## Quy trình từng bước
1. Đầu ca, mở POS và kiểm tra sản phẩm, giá bán, tồn kho.
2. Tạo hóa đơn tại quầy, xác nhận số lượng và phương thức thanh toán.
3. Xử lý tình huống tại quầy theo quy trình: đổi hàng, sai giá, thanh toán lỗi.
4. Cuối ca, đối soát doanh thu POS với số giao dịch thành công/thất bại.
5. Mở Activity Log để kiểm tra các thao tác nhạy cảm và xuất log khi cần.

## Lỗi thường gặp và cách xử lý
- Hóa đơn tạo xong nhưng tồn kho không giảm: kiểm tra trạng thái giao dịch và đồng bộ lại tồn kho.
- Không xem được log cần thiết: kiểm tra quyền truy cập và quyền export.
- Cuối ca lệch số liệu: truy vết từng giao dịch bằng Activity Log theo thời gian ca.
- Export log thiếu dữ liệu: kiểm tra lại bộ lọc user và khung thời gian.

## Checklist hoàn thành
- [ ] POS đã được kiểm tra trước khi mở bán.
- [ ] Hóa đơn tại quầy đã hoàn tất đúng trạng thái.
- [ ] Doanh thu và tồn kho cuối ca đã được đối soát.
- [ ] Activity Log đã được rà soát cho thao tác nhạy cảm.






