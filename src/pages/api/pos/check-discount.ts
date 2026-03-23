import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code) {
      return new Response(JSON.stringify({ error: 'Vui lòng nhập mã giảm giá' }), { status: 400 });
    }

    // 1. Lấy thông tin mã giảm giá từ CSDL
    const { data: discount, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !discount) {
      return new Response(JSON.stringify({ error: 'Mã giảm giá không tồn tại' }), { status: 404 });
    }

    // 2. Validate trạng thái
    if (discount.status !== 'Đang hoạt động') {
      return new Response(JSON.stringify({ error: 'Mã giảm giá không thể sử dụng (Trạng thái: ' + discount.status + ')' }), { status: 400 });
    }

    // 3. Validate thời gian (nếu có start_date và end_date)
    const now = new Date();
    if (discount.start_date && new Date(discount.start_date) > now) {
      return new Response(JSON.stringify({ error: 'Mã giảm giá này chưa có hiệu lực.' }), { status: 400 });
    }
    if (discount.end_date && new Date(discount.end_date) < now) {
      return new Response(JSON.stringify({ error: 'Mã giảm giá này đã hết hạn.' }), { status: 400 });
    }

    // 4. Validate giá trị đơn hàng tối thiểu
    if (discount.min_order_value && subtotal < discount.min_order_value) {
      return new Response(JSON.stringify({ error: `Đơn hàng chưa đủ điều kiện (tối thiểu ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discount.min_order_value)})` }), { status: 400 });
    }

    // 5. Validate số lượt sử dụng
    if (discount.usage_limit > 0 && discount.used_count >= discount.usage_limit) {
      return new Response(JSON.stringify({ error: 'Mã giảm giá này đã hết lượt sử dụng.' }), { status: 400 });
    }

    // POS: Đối với per_user_limit, khách mua tại quầy không đăng nhập auth.users
    // Nếu có mã KH, chúng ta phải ktra lịch sử. Tạm thời POS bỏ qua per_user_limit hoặc chỉ validate theo SĐT.
    // Bước này có thể để version mở rộng sau.

    // 6. Tính toán số tiền được giảm
    let calculatedDiscount = 0;
    if (discount.discount_type === 'percent') {
      calculatedDiscount = (subtotal * discount.discount_value) / 100;
    } else if (discount.discount_type === 'fixed') {
      calculatedDiscount = discount.discount_value;
    }

    // Không giảm quá subtotal
    if (calculatedDiscount > subtotal) {
      calculatedDiscount = subtotal;
    }

    return new Response(JSON.stringify({
      success: true,
      discountId: discount.id,
      discountCode: discount.code,
      discountAmount: calculatedDiscount,
      message: 'Áp dụng mã giảm giá thành công!'
    }), { status: 200 });

  } catch (error: any) {
    console.error('Check discount error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Lỗi hệ thống khi check mã' }), { status: 500 });
  }
};
