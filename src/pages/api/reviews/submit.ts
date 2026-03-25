import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (originCheck) return originCheck;

  try {
    const data = await request.json();
    const { productId, rating, comment, reviewerName, reviewerContact } = data;

    if (!productId || !rating || !reviewerName || !reviewerContact) {
      return new Response(JSON.stringify({ error: 'Vui lòng điền đầy đủ thông tin (Tên, Liên hệ, Số sao).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Kiểm tra xem user có phải là Admin (đã đăng nhập) không
    const sessionCookie = cookies.get('sb-access-token');
    let isAdmin = false;
    
    if (sessionCookie) {
      const { data: authData } = await supabase.auth.getUser(sessionCookie.value);
      if (authData.user) {
        isAdmin = true;
      }
    }

    let status = isAdmin ? 'approved' : 'pending';

    // Nếu không phải admin, xác thực xem họ đã mua hàng chưa
    if (!isAdmin) {
      // Tìm lịch sử mua hàng
      // Chúng ta sẽ kiểm tra xem có order nào thành công với số điện thoại/email này không
      // và order đó có chứa product_id hiện tại không.
      const safeContact = reviewerContact.trim();
      
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_items!inner(product_id)
        `)
        .or(`customer_phone.eq."${safeContact}",customer_email.eq."${safeContact}"`)
        .in('status', ['processing', 'completed'])
        .eq('order_items.product_id', productId);
      
      if (ordersError) {
        throw new Error(ordersError.message);
      }

      if (!orders || orders.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Chúng tôi không tìm thấy lịch sử mua sản phẩm này với Số điện thoại/Email bạn đã nhập. Chỉ khách hàng đã mua mới có thể đánh giá.' 
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Lọc rating
    const safeRating = Math.max(1, Math.min(5, Number(rating)));

    // Lưu review
    const { error: insertError } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        rating: safeRating,
        comment: comment || '',
        reviewer_name: reviewerName,
        reviewer_contact: reviewerContact,
        status: status
      });

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: isAdmin ? 'Đánh giá đã được đăng thành công!' : 'Trân trọng cảm ơn! Đánh giá của bạn đã được gửi và đang chờ duyệt.' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Submit review error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Lỗi server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
