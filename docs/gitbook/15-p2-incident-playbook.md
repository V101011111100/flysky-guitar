# P2-02 Playbook sự cố nâng cao

## Mục tiêu
Giúp đội vận hành xử lý sự cố nhanh, đúng thứ tự ưu tiên và giảm thời gian gián đoạn dịch vụ.

## Đối tượng áp dụng
- Admin.
- Nhân viên trực vận hành.
- Nhân viên CSKH phối hợp thông báo khách hàng.

## Điều kiện tiên quyết
- Có kênh thông báo sự cố nội bộ.
- Có danh sách owner theo module.
- Có quyền xem log và cấu hình liên quan.

## Quy trình từng bước
1. Tiếp nhận sự cố: ghi thời gian, phạm vi ảnh hưởng, dấu hiệu lỗi.
2. Phân loại mức độ P1/P2/P3 để ưu tiên xử lý.
3. Cô lập nguyên nhân theo module: thanh toán, shipping, media, auth hoặc settings.
4. Áp dụng workaround để hệ thống tiếp tục vận hành.
5. Khắc phục triệt để và kiểm tra lại luồng end-to-end.
6. Hậu kiểm: cập nhật SOP và ghi bài học rút kinh nghiệm.

## Lỗi thường gặp và cách xử lý
- Không rõ người chịu trách nhiệm: kích hoạt danh sách owner/on-call theo module.
- Sự cố tái diễn sau khi đã xử lý: bắt buộc tạo post-mortem ngắn và cập nhật SOP.
- CSKH truyền thông không thống nhất: dùng mẫu thông điệp chuẩn theo từng loại sự cố.
- Khắc phục xong nhưng chưa xác nhận đủ luồng: chạy lại checklist test nghiệp vụ P0.

## Checklist hoàn thành
- [ ] Sự cố đã được phân loại đúng mức độ.
- [ ] Workaround đã được áp dụng để giảm gián đoạn.
- [ ] Bản sửa đã được xác nhận bằng test thực tế.
- [ ] Đã cập nhật log vận hành và SOP sau sự cố.






