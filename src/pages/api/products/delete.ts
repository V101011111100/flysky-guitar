import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { logActivity, getClientIp } from '../../../lib/logger';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Auth check
    const accessToken = cookies.get("sb-access-token");
    const refreshToken = cookies.get("sb-refresh-token");

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
    }

    // 2. Parse payload
    const payload = await request.json();
    const productId = payload.id;

    if (!productId) {
      return new Response(JSON.stringify({ success: false, error: "Missing Product ID" }), { status: 400 });
    }

    // Delete product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
    
    const clientIp = await getClientIp(request);

    await logActivity({
      user_id: authData?.user?.id,
      user_name: authData?.user?.user_metadata?.full_name || authData?.user?.email || 'Admin',
      user_role: 'Quản trị viên',
      action_type: 'Xóa',
      action_text: `Xóa sản phẩm ID: ${productId}`,
      module_name: 'Inventory',
      ip_address: clientIp
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: any) {
    console.error("Delete Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
