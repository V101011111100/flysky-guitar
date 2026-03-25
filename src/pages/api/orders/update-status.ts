import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { logActivity, getClientIp } from '../../../lib/logger';
import { ensureSameOrigin } from '../../../lib/security';

const VALID_STATUSES = ['pending', 'processing', 'completed', 'cancelled'];

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

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

    const clientIp = await getClientIp(request);

    await logActivity({
      user_id: authData?.user?.id,
      user_name: authData?.user?.user_metadata?.full_name || authData?.user?.email || 'Admin',
      user_role: 'Quản trị viên',
      action_type: 'Cập nhật',
      action_text: `Cập nhật trạng thái đơn hàng #${id} thành ${status}`,
      module_name: 'Orders',
      ip_address: clientIp
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: any) {
    console.error('Update Order Status Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
