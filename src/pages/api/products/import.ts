import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';
import { ensureSameOrigin } from '../../../lib/security';

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
const UPSERT_CHUNK_SIZE = 200;

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return base || 'item';
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return new Response(JSON.stringify({ success: false, error: 'File quá lớn. Giới hạn 10MB.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls') && !lowerName.endsWith('.csv')) {
      return new Response(JSON.stringify({ success: false, error: 'Định dạng file không hợp lệ.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const wsname = wb.SheetNames[0];

    if (!wsname) {
      return new Response(JSON.stringify({ success: false, error: 'File Excel không có sheet dữ liệu.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ws = wb.Sheets[wsname];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

    if (!rows.length) {
      return new Response(JSON.stringify({ success: false, error: 'File không có dữ liệu để nhập.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validRows = rows.filter((row) => String(row['Tên sản phẩm'] || '').trim().length > 0);
    const skippedRows = rows.length - validRows.length;

    if (!validRows.length) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy dòng hợp lệ (thiếu Tên sản phẩm).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: existingCategories, error: categoryFetchError } = await supabase
      .from('categories')
      .select('id, name, slug');

    if (categoryFetchError) {
      throw new Error('Không thể tải danh mục hiện có.');
    }

    const categoriesByNormalizedName = new Map<string, { id: string }>();
    (existingCategories || []).forEach((cat: any) => {
      categoriesByNormalizedName.set(cat.name.trim().toLowerCase(), { id: cat.id });
    });

    const missingCategories = new Map<string, { name: string; slug: string }>();
    for (const row of validRows) {
      const categoryName = String(row['Danh mục'] || '').trim();
      if (!categoryName) continue;
      const normalized = categoryName.toLowerCase();
      if (!categoriesByNormalizedName.has(normalized) && !missingCategories.has(normalized)) {
        missingCategories.set(normalized, { name: categoryName, slug: slugify(categoryName) });
      }
    }

    if (missingCategories.size > 0) {
      const { data: insertedCategories, error: insertCategoryError } = await supabase
        .from('categories')
        .upsert(Array.from(missingCategories.values()), { onConflict: 'slug' })
        .select('id, name');

      if (insertCategoryError) {
        throw new Error('Không thể tạo danh mục mới từ file import.');
      }

      (insertedCategories || []).forEach((cat: any) => {
        categoriesByNormalizedName.set(String(cat.name).trim().toLowerCase(), { id: cat.id });
      });

      if (insertedCategories && insertedCategories.length !== missingCategories.size) {
        const { data: refreshedCategories } = await supabase.from('categories').select('id, name');
        (refreshedCategories || []).forEach((cat: any) => {
          categoriesByNormalizedName.set(String(cat.name).trim().toLowerCase(), { id: cat.id });
        });
      }
    }

    const upsertPayload = validRows.map((row, idx) => {
      const name = String(row['Tên sản phẩm'] || '').trim();
      const categoryName = String(row['Danh mục'] || '').trim();
      const categoryKey = categoryName.toLowerCase();
      const categoryId = categoryName ? categoriesByNormalizedName.get(categoryKey)?.id || null : null;

      const sku = String(row['SKU'] || '').trim();
      const slug = sku ? slugify(sku) : slugify(name || `product-${Date.now()}-${idx}`);

      const price = Math.max(0, toNumber(row['Giá bán'], 0));
      const stock = Math.max(0, Math.floor(toNumber(row['Số lượng'], 0)));
      const imageUrl = String(row['Link Ảnh'] || row['Hình Ảnh'] || '').trim();

      return {
        name,
        slug,
        category_id: categoryId,
        price,
        stock_quantity: stock,
        gallery_images: imageUrl ? [imageUrl] : null,
        description: String(row['Mô tả'] || '').trim() || null,
        status: stock > 0 ? 'active' : 'out_of_stock',
        spec_body: String(row['Lưng Hông'] || '').trim() || null,
        spec_top: String(row['Mặt Top'] || '').trim() || null,
        spec_neck: String(row['Cần Đàn'] || '').trim() || null,
      };
    });

    let importedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < upsertPayload.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = upsertPayload.slice(i, i + UPSERT_CHUNK_SIZE);
      const { error: chunkError } = await supabase
        .from('products')
        .upsert(chunk, { onConflict: 'slug' });

      if (!chunkError) {
        importedCount += chunk.length;
        continue;
      }

      for (const row of chunk) {
        const { error: rowError } = await supabase
          .from('products')
          .upsert(row, { onConflict: 'slug' });
        if (rowError) {
          failedCount += 1;
        } else {
          importedCount += 1;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: importedCount,
        failedCount,
        skippedCount: skippedRows,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (err: any) {
    console.error('Import Error:', err.message || err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message || 'Không thể nhập file Excel lúc này.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
