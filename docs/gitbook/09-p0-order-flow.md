# P0-02 Đơn hàng từ Cart đến hoàn tất

## Mục tiêu
Đảm bảo mọi đơn hàng được tiếp nhận, xác minh thanh toán, giao vận và đóng đơn đúng quy trình, không treo trạng thái.

## Đối tượng áp dụng
- Nhân viên xử lý đơn hàng.
- Admin giám sát và đối soát cuối kỳ.

## Điều kiện tiên quyết
- Sản phẩm còn tồn kho và hiển thị đúng.
- Cấu hình thanh toán đang hoạt động.
- Cấu hình vận chuyển đã sẵn sàng.

## Quy trình từng bước
1. Mở Orders, lọc đơn mới và kiểm tra thông tin khách hàng.
2. Xác minh trạng thái thanh toán theo phương thức khách đã chọn.
3. Kiểm tra tồn kho thực tế trước khi chuyển sang xử lý đóng gói.
4. Tạo vận đơn, gắn mã tracking và cập nhật trạng thái giao hàng.
5. Khi giao thành công, chuyển trạng thái completed và ghi chú đối soát.
6. Cuối ngày, đối chiếu dữ liệu Orders với Shipping để xử lý lệch.

## Lỗi thường gặp và cách xử lý
- Đơn đã thanh toán nhưng vẫn pending: kiểm tra đối soát giao dịch và cập nhật trạng thái đúng.
- Đơn shipped nhưng thiếu tracking: bổ sung tracking ngay và kiểm tra quy trình bàn giao.
- Đơn trùng do khách gửi nhiều lần: đối chiếu theo số liên hệ, thời gian, giá trị đơn trước khi xử lý.
- Thiếu hàng khi bắt đầu đóng gói: liên hệ khách để đổi sản phẩm hoặc hoàn tiền theo chính sách.

## Checklist hoàn thành
- [ ] Đơn mới đã được tiếp nhận trong ngày.
- [ ] Trạng thái thanh toán được xác minh đầy đủ.
- [ ] Mọi đơn shipped có mã tracking.
- [ ] Đơn hoàn tất đã được đối soát cuối ngày.






