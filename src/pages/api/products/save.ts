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
    const productId = payload['prod-id']; // empty if new
    const name = payload['prod-name'];
    const slug = payload['prod-slug'];
    const price = parseInt(payload['prod-price'] || '0');
    const imageUrl = payload['prod-image'];
    const desc = payload['prod-desc'];
    const categoryId = payload['prod-category'] || null;
    const specBody = payload['prod-body'] || null;
    const specTop = payload['prod-top'] || null;
    const specNeck = payload['prod-neck'] || null;
    const stockQuantity = parseInt(payload['prod-stock'] || '0');
    const status = payload['prod-status'] || 'active';

    if (!name || !slug || !imageUrl) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400 });
    }

    // Auto-migrate tables if not exists 
    try { await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_body text;' }); } catch(err){}
    try { await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_top text;' }); } catch(err){}
    try { await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_neck text;' }); } catch(err){}
    try { await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS stock_quantity integer not null default 0;' }); } catch(err){}

    const dbPayload = {
      name: name,
      slug: slug,
      category_id: categoryId,
      price: price,
      main_image_url: imageUrl,
      description: desc,
      spec_body: specBody,
      spec_top: specTop,
      spec_neck: specNeck,
      stock_quantity: stockQuantity,
      status: status
    };

    if (productId) {
      // Update existing
      const { error } = await supabase
        .from('products')
        .update(dbPayload)
        .eq('id', productId);
        
      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('products')
        .insert([dbPayload]);

      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: any) {
    console.error("Save Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
