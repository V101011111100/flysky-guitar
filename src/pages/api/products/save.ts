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
    const categoryId = payload['prod-category'] ? payload['prod-category'] : null;
    const specBody = payload['prod-body'] || null;
    const specTop = payload['prod-top'] || null;
    const specNeck = payload['prod-neck'] || null;
    const stockQuantity = parseInt(payload['prod-stock'] || '0') || 0;
    const status = payload['prod-status'] || 'active';

    // Parse gallery images (array of additional image URLs)
    let galleryImages: string[] = [];
    try {
      const galleryRaw = payload['prod-gallery'];
      if (galleryRaw) galleryImages = JSON.parse(galleryRaw);
    } catch { }

    // Add main image as first element in gallery if provided
    if (imageUrl) {
      galleryImages = [imageUrl, ...galleryImages];
    }

    if (!name || !slug) {
      return new Response(JSON.stringify({ success: false, error: "Tên sản phẩm và Đường dẫn hiển thị (slug) là bắt buộc" }), { status: 400 });
    }

    // Auto-migrate tables if not exists
    try { await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_body text;' }); } catch (err) { }
    try { await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_top text;' }); } catch (err) { }
    try { await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_neck text;' }); } catch (err) { }
    try { await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS stock_quantity integer not null default 0;' }); } catch (err) { }
    try { await supabase.rpc('exec_sql', { sql_string: "ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS gallery_images text[];" }); } catch (err) { }

    const dbPayload = {
      name: name,
      slug: slug,
      category_id: categoryId,
      price: price,
      description: desc,
      spec_body: specBody,
      spec_top: specTop,
      spec_neck: specNeck,
      stock_quantity: stockQuantity,
      status: status,
      gallery_images: galleryImages.length > 0 ? galleryImages : null
    };

    if (productId) {
      // Update existing
      const { error } = await supabase
        .from('products')
        .update(dbPayload)
        .eq('id', productId);

      if (error) {
        console.error("Supabase Update Error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message || "Database error" }), { status: 400 });
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('products')
        .insert([dbPayload]);

      if (error) {
        console.error("Supabase Insert Error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message || "Database error" }), { status: 400 });
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: any) {
    console.error("Save Exception:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Unknown error' }), { status: 500 });
  }
};
