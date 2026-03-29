# P0-03 Quản lý sản phẩm và tồn kho

## Mục tiêu
Giữ dữ liệu sản phẩm chính xác, media hiển thị tốt và tồn kho đồng bộ để tránh sai lệch khi bán hàng.

## Đối tượng áp dụng
- Nhân viên quản lý sản phẩm và kho.
- Admin phê duyệt thay đổi quan trọng.

## Điều kiện tiên quyết
- Có quyền vào Products và Inventory.
- Danh mục sản phẩm đã được thống nhất.
- Có bộ ảnh/video sản phẩm đủ chất lượng.

## Quy trình từng bước
1. Tạo mới hoặc cập nhật thông tin sản phẩm: tên, giá, mô tả, danh mục, trạng thái.
2. Upload ảnh/video và xác nhận ảnh chính hiển thị đúng.
3. Cập nhật tồn kho theo nhập/xuất hoặc file import.
4. Đặt trạng thái out_of_stock cho mặt hàng hết tồn.
5. Kiểm tra hiển thị ở Shop và trang chi tiết sản phẩm.
6. Cuối ngày đối chiếu tồn kho hệ thống với tồn kho thực tế.

## Lỗi thường gặp và cách xử lý
- Sản phẩm không xuất hiện trên Shop: kiểm tra trạng thái active và danh mục.
- Ảnh hiển thị lỗi hoặc mờ: upload lại media chuẩn và kiểm tra link.
- Tồn kho âm hoặc lệch lớn: kiểm tra lịch sử cập nhật và đối soát lại theo chứng từ.
- Sai danh mục sản phẩm: cập nhật lại category và kiểm tra bộ lọc storefront.

## Checklist hoàn thành
- [ ] Sản phẩm mới/sửa đã đủ thông tin bắt buộc.
- [ ] Ảnh và media hiển thị ổn định.
- [ ] Tồn kho đã cập nhật và không âm.
- [ ] Đã đối soát nhanh dữ liệu hiển thị ngoài frontend.






