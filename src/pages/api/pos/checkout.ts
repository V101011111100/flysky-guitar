import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { items, customerName, customerPhone, subtotal, discountAmount, discountCode, discountId, shippingFee, total, status } = body;

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Giỏ hàng trống!' }), { status: 400 });
    }

    // 1. Generate Order Number
    const date = new Date();
    const yy = date.getFullYear().toString().slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000); // 4 digits
    const orderNumber = `POS-${yy}${mm}${dd}-${random}`;

    // 2. Tên khách hàng mặc định nếu không nhập
    const name = customerName || 'Khách vãng lai';
    const phone = customerPhone || '0000000000';

    // 3. Tạo Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: name,
        customer_phone: phone,
        total_amount: total,
        discount_amount: discountAmount || 0,
        discount_code: discountCode || null,
        discount_id: discountId || null,
        shipping_fee: shippingFee || 0,
        source: 'pos',
        status: status || 'completed', // POS orders can be 'completed' or 'pending' (draft)
        payment_method: 'cash'
      })
      .select('id')
      .single();

    if (orderError) throw orderError;

    // 4. Tạo Order Items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.qty,
      price_at_time: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return new Response(JSON.stringify({ success: true, orderId: order.id, orderNumber }), { status: 200 });

  } catch (error: any) {
    console.error('POS Checkout Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Lỗi hệ thống' }), { status: 500 });
  }
};
