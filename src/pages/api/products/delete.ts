import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

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

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: any) {
    console.error("Delete Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
