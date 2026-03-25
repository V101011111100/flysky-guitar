import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';
import { ensureSameOrigin } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (originCheck) return originCheck;

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

    // 2. Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: "No file uploaded" }), { status: 400 });
    }

    // 3. Read Excel using node buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const data: any[] = XLSX.utils.sheet_to_json(ws);

    // 4. Process Data
    let importedCount = 0;

    for (const item of data) {
      const name = item['Tên sản phẩm'];
      if (!name) continue; // Skip empty rows

      const categoryName = item['Danh mục'];
      const price = item['Giá bán'] || 0;
      const stock = item['Số lượng'] || 0;
      const imageUrl = item['Link Ảnh'] || '';
      const description = item['Mô tả'] || '';

      // Handle Category
      let categoryId = null;
      if (categoryName) {
        // Query category by name
        let { data: catData } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', categoryName) // case insensitive
          .single();

        if (catData) {
          categoryId = catData.id;
        } else {
          // Create new category mapping Vietnamese to english slug roughly
          const catSlug = categoryName.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

          const { data: newCat } = await supabase
            .from('categories')
            .insert({ name: categoryName, slug: catSlug })
            .select('id')
            .single();

          if (newCat) categoryId = newCat.id;
        }
      }

      // Generate a clean slug for product (Mapping SKU to slug to ensure unique upserting)
      let productSlug = name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      if (item['SKU']) {
        productSlug = item['SKU'].toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }

      // Auto-migrate tables if columns don't exist (Supabase specific hack for rapid prototyping)
      // Executing one by one, ignore errors if it doesn't exist
      if (importedCount === 0) {
        try { await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_body text;' }); } catch (err) { }
        try { await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_top text;' }); } catch (err) { }
        try { await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_neck text;' }); } catch (err) { }
      }

      // Upsert product relying on 'slug' as unique identifier
      // Add image as first element in gallery
      const galleryImages = imageUrl ? [imageUrl] : [];

      const { error: upsertErr } = await supabase
        .from('products')
        .upsert({
          name: name,
          slug: productSlug,
          category_id: categoryId,
          price: price,
          gallery_images: galleryImages.length > 0 ? galleryImages : null,
          description: description,
          status: stock > 0 ? 'active' : 'out_of_stock',
          spec_body: item['Lưng Hông'] || null,
          spec_top: item['Mặt Top'] || null,
          spec_neck: item['Cần Đàn'] || null
        }, { onConflict: 'slug' });

      if (upsertErr) {
        console.error("Lỗi khi nhập sản phẩm:", name, upsertErr);
      } else {
        importedCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, count: importedCount }), { status: 200 });

  } catch (err: any) {
    console.error("Import Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
