-- Thêm mẫu mặc định cho Phiếu In Nhiệt (80mm)
insert into public.print_templates (name, type, is_active, settings)
values (
  'Phiếu In Nhiệt Chuẩn (Mặc định)',
  'invoice_thermal',
  true,
  '{
    "invoice_store_name": "FLYSKY GUITAR",
    "invoice_slogan": "Âm thanh từ tâm hồn - Chất lượng từ đam mê",
    "invoice_address": "123 Đường Nhạc Cụ, Quận 1, TP. HCM",
    "invoice_phone": "090 123 4567",
    "invoice_website": "www.flyskyguitar.vn",
    "invoice_footer_msg": "Cảm ơn quý khách! Hẹn gặp lại."
  }'::jsonb
) on conflict do nothing;

-- Mẫu Email 1: Xác nhận đơn hàng / Cảm ơn mua hàng
insert into public.print_templates (name, type, is_active, settings)
values (
  'Email Cảm Ơn Mua Hàng (Mặc định)',
  'email_order_confirm',
  true,
  '{
    "email_store_name": "FlySky Guitar",
    "email_subject": "Cảm ơn {{customer_name}} đã mua hàng tại FlySky Guitar!",
    "email_hero_title": "Cảm ơn bạn đã tin chọn FlySky Guitar",
    "email_greeting": "Chào bạn {{customer_name}}!",
    "email_body": "Chúng tôi hy vọng bạn đang tận hưởng cây đàn mới của mình. Ý kiến của bạn rất quan trọng để chúng tôi hoàn thiện dịch vụ và sản phẩm hơn nữa.",
    "email_cta_primary": "Gửi đánh giá nhanh",
    "email_cta_secondary": "Viết nhận xét chi tiết",
    "email_warranty_text": "Bảo hành tận tâm",
    "email_warranty_sub": "Chính sách 24 tháng",
    "email_support_phone": "1900 123 456",
    "email_store_address": "123 Đường Nhạc Cụ, Quận 1, TP. Hồ Chí Minh",
    "email_store_hours": "08:00 - 21:00 hàng ngày"
  }'::jsonb
) on conflict do nothing;

-- Mẫu Email 2: Thông báo vận chuyển
insert into public.print_templates (name, type, is_active, settings)
values (
  'Email Thông Báo Vận Chuyển (Mặc định)',
  'email_shipping',
  true,
  '{
    "email_store_name": "FlySky Guitar",
    "email_subject": "Đơn hàng {{order_id}} của bạn đang trên đường đến!",
    "email_hero_title": "Đơn hàng của bạn đang trên đường đến!",
    "email_hero_subtitle": "Tin vui! Đơn hàng của bạn đã được đóng gói cẩn thận và bàn giao cho đơn vị vận chuyển.",
    "email_shipping_unit": "GIAO HÀNG NHANH (GHN)",
    "email_tracking_label": "MÃ VẬN ĐƠN",
    "email_status_text": "Trạng thái: Đang vận chuyển",
    "email_eta_text": "Dự kiến giao: 2-3 ngày làm việc",
    "email_cta": "Theo dõi đơn hàng",
    "email_admin_note": "* Admin của FlySky sẽ sớm liên hệ với bạn để tư vấn thêm về việc bảo quản và vận chuyển đàn trong suốt hành trình.",
    "email_support_phone": "1900 xxxx",
    "email_support_email": "contact@flyskyguitar.com",
    "email_store_address": "456 Đường Giai Điệu, Quận 3, TP. Hồ Chí Minh",
    "email_store_name_footer": "FlySky Guitar Showroom"
  }'::jsonb
) on conflict do nothing;

-- Mẫu Email 3: Khảo sát / Đánh giá
insert into public.print_templates (name, type, is_active, settings)
values (
  'Email Khảo Sát Khách Hàng',
  'email_survey',
  true,
  '{
    "email_store_name": "FlySky Guitar",
    "email_subject": "Bạn đánh giá thế nào về trải nghiệm tại FlySky Guitar?",
    "email_hero_title": "Ý kiến của bạn giúp chúng tôi tốt hơn",
    "email_greeting": "Xin chào {{customer_name}}!",
    "email_body": "Cảm ơn bạn đã ghé thăm FlySky Guitar. Chúng tôi luôn muốn cải thiện dịch vụ và sản phẩm của mình. Bạn có thể dành vài phút để chia sẻ trải nghiệm không?",
    "email_cta_primary": "Đánh giá ngay",
    "email_cta_secondary": "Xem ưu đãi mới nhất",
    "email_support_phone": "1900 123 456",
    "email_store_address": "123 Đường Nhạc Cụ, Quận 1, TP. Hồ Chí Minh"
  }'::jsonb
) on conflict do nothing;
