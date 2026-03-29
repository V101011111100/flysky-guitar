# P0-01 Bảo mật tài khoản và phân quyền

## Mục tiêu
Đảm bảo chỉ đúng người, đúng vai trò mới được truy cập đúng chức năng; giảm rủi ro lộ tài khoản và sai quyền thao tác.

## Đối tượng áp dụng
- Admin quản trị hệ thống.
- Nhân viên được cấp quyền xử lý tài khoản hoặc vận hành nghiệp vụ.

## Điều kiện tiên quyết
- Có tài khoản admin đang hoạt động.
- Đã đăng nhập được vào khu vực quản trị.
- Có danh sách nhân sự cần cấp hoặc thu hồi quyền.

## Quy trình từng bước
1. Đăng nhập vào khu vực admin bằng tài khoản được cấp.
2. Hoàn tất xác thực MFA nếu hệ thống yêu cầu.
3. Mở Permissions, cấp quyền theo đúng vai trò công việc.
4. Không cấp quyền nhạy cảm ngoài nhu cầu thực tế.
5. Mở Security/Sessions để kiểm tra và thu hồi session bất thường.
6. Kiểm tra Activity Log cho các thao tác nhạy cảm: đổi quyền, đăng nhập thất bại, thay đổi cấu hình.

## Lỗi thường gặp và cách xử lý
- Nhân viên không thấy module vừa cấp quyền: yêu cầu đăng xuất/đăng nhập lại hoặc thu hồi session cũ.
- Đăng nhập đúng mật khẩu nhưng không vào được: kiểm tra trạng thái tài khoản và bước MFA.
- Phát hiện session lạ: thu hồi toàn bộ session nghi ngờ, đổi mật khẩu, xác nhận lại MFA.
- Nhân viên có quyền vượt phạm vi: rà soát ma trận quyền và thu hồi ngay quyền sai.

## Checklist hoàn thành
- [ ] Tài khoản admin đã bật MFA.
- [ ] Quyền của từng nhân sự khớp vai trò thực tế.
- [ ] Session lạ đã được thu hồi.
- [ ] Activity Log đã được kiểm tra trong ngày.






