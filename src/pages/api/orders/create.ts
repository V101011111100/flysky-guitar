import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

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

    // Try to add `items` column if missing (ignore errors)
    try {
      await supabase.rpc('exec_sql', {
        sql_string: `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb`
      });
    } catch (e) {}

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

    // Add items as JSON if the column exists (ignore PostgREST schema cache timing)
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([{ ...payload, items: items || [] }])
        .select('id, order_number')
        .single();

      if (!error && data) {
        return new Response(JSON.stringify({ success: true, order_number: data.order_number, id: data.id }), { status: 200 });
      }

      // If items column not found in schema cache, try without it
      if (error?.message?.includes("'items'")) {
        const { data: d2, error: e2 } = await supabase
          .from('orders')
          .insert([payload])
          .select('id, order_number')
          .single();

        if (e2) throw e2;
        return new Response(JSON.stringify({ success: true, order_number: d2.order_number, id: d2.id }), { status: 200 });
      }

      if (error) throw error;
    } catch (insertErr: any) {
      throw insertErr;
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown error' }), { status: 500 });

  } catch (err: any) {
    console.error('Create Order Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
