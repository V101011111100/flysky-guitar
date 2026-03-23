import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, discounts: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { code, description, discount_type, discount_value, status, start_date, end_date, min_order_value, usage_limit, per_user_limit } = body;

    if (!code || !discount_value) {
      return new Response(JSON.stringify({ error: 'Mã và Giá trị giảm là bắt buộc' }), { status: 400 });
    }

    const payload = {
      code: code.toUpperCase(),
      description,
      discount_type: discount_type || 'percent',
      discount_value,
      status: status || 'Đang hoạt động',
      start_date: start_date || null,
      end_date: end_date || null,
      min_order_value: min_order_value || 0,
      usage_limit: usage_limit || 0,
      per_user_limit: per_user_limit || 1
    };

    const { data, error } = await supabase
      .from('discounts')
      .insert([payload])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'Mã giảm giá đã tồn tại' }), { status: 400 });
      }
      throw error;
    }

    return new Response(JSON.stringify({ success: true, discount: data }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, code, description, discount_type, discount_value, status, start_date, end_date, min_order_value, usage_limit, per_user_limit } = body;

    if (!id || !code || !discount_value) {
      return new Response(JSON.stringify({ error: 'ID, Mã và Giá trị giảm là bắt buộc' }), { status: 400 });
    }

    const payload = {
      code: code.toUpperCase(),
      description,
      discount_type: discount_type || 'percent',
      discount_value,
      status: status || 'Đang hoạt động',
      start_date: start_date || null,
      end_date: end_date || null,
      min_order_value: min_order_value || 0,
      usage_limit: usage_limit || 0,
      per_user_limit: per_user_limit || 1
    };

    const { data, error } = await supabase
      .from('discounts')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'Mã giảm giá đã tồn tại' }), { status: 400 });
      }
      throw error;
    }

    return new Response(JSON.stringify({ success: true, discount: data }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });

    // Tránh xóa các mã đã được dùng trong order. Tùy logic, nhưng ở đây cứ xóa thôi hoặc chỉ đổi status thành Đã hết hạn
    // Để an toàn, có thể chỉ xóa nếu used_count == 0, nhưng tạm thời xóa mềm hoặc cứng là tùy
    const { error } = await supabase.from('discounts').delete().eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
