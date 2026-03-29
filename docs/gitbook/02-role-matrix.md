# Ma trận vai trò Admin và Nhân viên

## Nguyên tắc phân quyền
- Admin có quyền cấu hình hệ thống và duyệt các thay đổi nhạy cảm.
- Nhân viên chỉ thao tác trên module được cấp trong Permissions.
- Mọi quyền vượt chuẩn phải có phê duyệt và thời hạn rõ ràng.

## Ma trận quyền theo nhóm chức năng

| Nhóm chức năng | Admin | Nhân viên |
|---|---|---|
| Dashboard | Toàn quyền xem và phân tích | Xem theo quyền được cấp |
| Sản phẩm và tồn kho | Tạo/sửa/xóa/import/export | Thao tác theo quyền products/inventory |
| Đơn hàng và vận chuyển | Toàn quyền xử lý, đối soát | Thao tác theo quyền orders/shipping |
| POS | Toàn quyền cấu hình và đối soát | Vận hành bán tại quầy theo quyền pos |
| Consultations và reviews | Toàn quyền duyệt và quản lý | Xử lý theo quyền consultations/reviews |
| Blog, SEO, newsletter, discount | Toàn quyền chiến dịch và nội dung | Thao tác theo quyền marketing/content |
| Permissions, security, sessions | Toàn quyền | Chỉ khi được cấp đặc biệt |
| Activity log | Toàn quyền xem/export | Xem theo quyền được cấp |

## Trách nhiệm chính
- Admin: ban hành chính sách quyền, rà soát định kỳ, xử lý sự cố bảo mật.
- Nhân viên: thao tác đúng phạm vi, ghi chú đầy đủ, báo cáo bất thường kịp thời.






