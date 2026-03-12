import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const VALID_STATUSES = ['pending', 'processing', 'completed', 'cancelled'];

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Auth check
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu id hoặc status' }), { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return new Response(JSON.stringify({ success: false, error: 'Trạng thái không hợp lệ' }), { status: 400 });
    }

    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: any) {
    console.error('Update Order Status Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
