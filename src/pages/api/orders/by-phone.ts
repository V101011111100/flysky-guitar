import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const phone = url.searchParams.get('phone');
  if (!phone) {
    return new Response(JSON.stringify({ orders: [] }), { status: 200 });
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, total_amount, created_at, shipping_address, payment_method')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ orders: [], error: error.message }), { status: 200 });
  }

  return new Response(JSON.stringify({ orders: data || [] }), { status: 200 });
};
