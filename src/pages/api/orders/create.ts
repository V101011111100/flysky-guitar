import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { sendEmail, buildOrderConfirmationFromTemplate } from '../../../lib/email';
import { sendPushToAll } from '../../../lib/push';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      note,
      payment_method,
      items,
      total_amount,
    } = body;

    if (!customer_name || !customer_phone || !customer_address) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu thông tin bắt buộc' }), { status: 400 });
    }

    // Bỏ qua bước tạo cột JSONB items vì cần insert vào bảng order_items chuẩn để chạy Triggers

    // Generate order number: FSG-YYMMDD-XXXX
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const order_number = `FSG-${datePart}-${randPart}`;

    // Build insert payload — use actual DB column names
    const payload: Record<string, any> = {
      order_number,
      customer_name,
      customer_phone,
      customer_email: customer_email || null,
      shipping_address: customer_address,  // ← actual DB column name
      note: note || null,
      payment_method: payment_method || 'bank',
      total_amount: total_amount || 0,
      status: 'pending',
    };

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([payload])
        .select('id, order_number')
        .single();

      if (error) throw error;

      // Sau khi tạo order, insert các sản phẩm vào order_items (Để kích hoạt Trigger trừ kho)
      if (items && Array.isArray(items) && items.length > 0) {
        const isUUID = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
        
        // Tách ra những item bị lưu bằng slug
        const idsAndSlugs = items.map((item: any) => item.id || item.product_id || '');
        const slugsToFetch = idsAndSlugs.filter((id) => id && !isUUID(id));

        const slugToIdMap = new Map();

        if (slugsToFetch.length > 0) {
          const { data: dbProducts } = await supabase
            .from('products')
            .select('id, slug')
            .in('slug', slugsToFetch);

          if (dbProducts) {
             dbProducts.forEach(p => slugToIdMap.set(p.slug, p.id));
          }
        }

        const orderItemsForDb = items.map((item: any) => {
          const identifier = item.id || item.product_id || '';
          let finalId = isUUID(identifier) ? identifier : slugToIdMap.get(identifier);
          return {
            order_id: data.id,
            product_id: finalId || null,
            quantity: item.quantity || item.qty || 1,
            price_at_time: item.price || 0
          };
        }).filter(item => item.product_id !== null); // Chỉ giữ lại các item đã có UUID hợp lệ

        if (orderItemsForDb.length > 0) {
          const { error: itemsErr } = await supabase
            .from('order_items')
            .insert(orderItemsForDb);

          if (itemsErr) {
            console.error("Lỗi insert order_items:", itemsErr);
          }
        }
      }

      // Gửi email + push notification (fire-and-forget, không block response)
      const notifyAll = async () => {
        try {
          // 1. Email xác nhận đơn hàng cho khách hàng
          if (customer_email) {
            const { subject: emailSubject, html: emailHtml } =
              await buildOrderConfirmationFromTemplate({
                order_number: data.order_number,
                customer_name,
                customer_phone,
                customer_address: customer_address,
                payment_method: payment_method || 'bank',
                total_amount: total_amount || 0,
                items: Array.isArray(items)
                  ? items.map((item: any) => ({
                      name: item.name || item.categoryLabel || 'Sản phẩm',
                      quantity: item.quantity || item.qty || 1,
                      price: item.price || 0,
                    }))
                  : [],
                note: note || undefined,
              });
            await sendEmail({
              to: customer_email,
              subject: emailSubject,
              html: emailHtml,
              templateKey: 'order_confirmation_customer',
            });
          }

          // 3. Push notification cho admin
          await sendPushToAll(
            `🛒 Đơn hàng mới #${data.order_number}`,
            `${customer_name} — ${(total_amount || 0).toLocaleString('vi-VN')}đ`,
            '/admin/orders'
          );
        } catch {}
      };
      notifyAll();

      return new Response(JSON.stringify({ success: true, order_number: data.order_number, id: data.id }), { status: 200 });

    } catch (insertErr: any) {
      throw insertErr;
    }

  } catch (err: any) {
    console.error('Create Order Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
