# P2-03 Governance nội bộ và release checklist

## Mục tiêu
Kiểm soát thay đổi trước, trong và sau release để giảm rủi ro lỗi nghiệp vụ và đảm bảo khả năng rollback.

## Đối tượng áp dụng
- Admin.
- Người duyệt release.
- Nhân sự kỹ thuật và vận hành tham gia triển khai.

## Điều kiện tiên quyết
- Có quy trình branch/review nội bộ.
- Có danh sách người phê duyệt release.
- Có tiêu chí pass/fail trước khi phát hành.

## Quy trình từng bước
1. Chốt phạm vi release: tính năng, bản sửa lỗi, thay đổi cấu hình.
2. Đánh dấu hạng mục nhạy cảm: auth, payment, orders, shipping, data migration.
3. Chạy kiểm tra trước release: build, typecheck, security checks, test luồng P0.
4. Chốt rollback plan và người chịu trách nhiệm kích hoạt rollback.
5. Lấy phê duyệt cuối từ owner kỹ thuật và owner vận hành.
6. Theo dõi log và KPI 30-60 phút sau release, cập nhật changelog nội bộ.

## Lỗi thường gặp và cách xử lý
- Release xong mới phát hiện lỗi nghiệp vụ: bổ sung UAT matrix theo vai trò trước khi release.
- Có migration nhưng thiếu kiểm tra bảo mật dữ liệu: bắt buộc rà soát migration và quyền truy cập liên quan.
- Không có rollback rõ ràng: không triển khai cho đến khi có kịch bản rollback khả thi.
- Theo dõi hậu release chưa đủ: thiết lập người trực theo dõi trong giờ đầu sau phát hành.

## Checklist hoàn thành
- [ ] Build, typecheck và kiểm tra bảo mật đã đạt.
- [ ] Luồng P0 đã được UAT.
- [ ] Rollback plan đã sẵn sàng và có owner.
- [ ] Release đã có phê duyệt đầy đủ.
- [ ] Đã theo dõi và ghi nhận hậu release.






