import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { logActivity, getClientIp } from '../../../lib/logger';
import { ensureSameOrigin, getAdminMfaState } from '../../../lib/security';

const ALLOWED_FIELDS: Record<string, string> = {
  name: 'name',
  subtitle: 'subtitle',
  price: 'price',
  description: 'description',
  spec_body: 'spec_body',
  spec_top: 'spec_top',
  spec_neck: 'spec_neck',
  stock_quantity: 'stock_quantity',
  product_condition: 'product_condition',
  status: 'status',
  video_url: 'video_url',
  gallery_images: 'gallery_images',
  benefits: 'benefits',
  highlight_features: 'highlight_features',
};

const CONDITION_VALUES = new Set(['new', 'used', 'like_new']);
const STATUS_VALUES = new Set(['active', 'out_of_stock', 'draft']);

function normalizeStringArray(value: unknown, maxItems = 12) {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\r?\n|,/)
      : [];

  return Array.from(
    new Set(
      rawItems
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, maxItems);
}

function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';

  if (Array.isArray(value)) {
    const values = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => `'${item.replace(/'/g, "''")}'`);

    return values.length > 0 ? `ARRAY[${values.join(', ')}]::text[]` : 'NULL';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function getAdminSupabaseClient() {
  const url = import.meta.env.SUPABASE_URL || '';
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceKey) {
    return supabase;
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function ensureProductQuickUpdateColumns(client: any) {
  const statements = [
    'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS subtitle text;',
    'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_body text;',
    'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_top text;',
    'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS spec_neck text;',
    'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS stock_quantity integer not null default 0;',
    "ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS product_condition text not null default 'new';",
    'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS video_url text;',
    'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS gallery_images text[];',
    'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS benefits text[];',
    'ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS highlight_features text[];',
    "NOTIFY pgrst, 'reload schema';",
  ];

  for (const sql of statements) {
    try {
      await client.rpc('exec_sql', { sql_string: sql });
    } catch {
      // best-effort auto-migration for older databases
    }
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const authState = await getAdminMfaState(accessToken.value, refreshToken.value);
    if (!authState.authenticated || !authState.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    if (!authState.isAdmin || authState.requiresMfa) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    const adminSupabase = getAdminSupabaseClient();

    const body = await request.json().catch(() => ({}));
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    const field = typeof body?.field === 'string' ? body.field.trim() : '';
    const value = body?.value;

    if (!slug || !field || value === undefined) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu dữ liệu cập nhật' }), { status: 400, headers: corsHeaders });
    }

    const dbField = ALLOWED_FIELDS[field];
    if (!dbField) {
      return new Response(JSON.stringify({ success: false, error: 'Trường cập nhật không hợp lệ' }), { status: 400, headers: corsHeaders });
    }

    await ensureProductQuickUpdateColumns(adminSupabase);

    const { data: existingProduct, error: lookupError } = await adminSupabase
      .from('products')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (lookupError || !existingProduct?.id) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy sản phẩm' }), { status: 404, headers: corsHeaders });
    }

    let parsedValue: unknown = value;

    if (field === 'price') {
      parsedValue = parseInt(String(value).replace(/\D/g, ''), 10);
      if (Number.isNaN(parsedValue) || Number(parsedValue) < 0) {
        return new Response(JSON.stringify({ success: false, error: 'Giá không hợp lệ' }), { status: 400, headers: corsHeaders });
      }
    } else if (field === 'stock_quantity') {
      parsedValue = parseInt(String(value).replace(/\D/g, ''), 10);
      if (Number.isNaN(parsedValue) || Number(parsedValue) < 0) {
        return new Response(JSON.stringify({ success: false, error: 'Số lượng tồn kho không hợp lệ' }), { status: 400, headers: corsHeaders });
      }
    } else if (field === 'product_condition') {
      parsedValue = String(value || '').trim();
      if (!CONDITION_VALUES.has(String(parsedValue))) {
        return new Response(JSON.stringify({ success: false, error: 'Tình trạng sản phẩm không hợp lệ' }), { status: 400, headers: corsHeaders });
      }
    } else if (field === 'status') {
      parsedValue = String(value || '').trim();
      if (!STATUS_VALUES.has(String(parsedValue))) {
        return new Response(JSON.stringify({ success: false, error: 'Trạng thái sản phẩm không hợp lệ' }), { status: 400, headers: corsHeaders });
      }
    } else if (field === 'gallery_images') {
      parsedValue = normalizeStringArray(value, 12);
    } else if (field === 'benefits' || field === 'highlight_features') {
      parsedValue = normalizeStringArray(value, 6);
    } else {
      parsedValue = String(value ?? '').trim();
      if (field === 'name' && !parsedValue) {
        return new Response(JSON.stringify({ success: false, error: 'Tên sản phẩm không được để trống' }), { status: 400, headers: corsHeaders });
      }
      if (field !== 'name' && !parsedValue) {
        parsedValue = null;
      }
    }

    const updateValue = Array.isArray(parsedValue) ? (parsedValue.length > 0 ? parsedValue : null) : parsedValue;
    let updateError: any = null;

    const { error } = await adminSupabase
      .from('products')
      .update({ [dbField]: updateValue })
      .eq('id', existingProduct.id);

    updateError = error;

    if (updateError?.code === 'PGRST204') {
      await ensureProductQuickUpdateColumns(adminSupabase);

      const rawSql = `
        UPDATE public.products
        SET ${dbField} = ${toSqlLiteral(updateValue)}
        WHERE id = '${String(existingProduct.id).replace(/'/g, "''")}';
        NOTIFY pgrst, 'reload schema';
      `;

      const { error: fallbackError } = await adminSupabase.rpc('exec_sql', { sql_string: rawSql });
      updateError = fallbackError ?? null;
    }

    if (updateError) {
      console.error('[products/quick-update] Failed to update product:', updateError);
      const detailedError = typeof updateError?.message === 'string' && updateError.message.includes('schema cache')
        ? `Database đang thiếu hoặc chưa reload cột \"${dbField}\" trong bảng products.`
        : 'Không thể lưu thay đổi sản phẩm';
      return new Response(JSON.stringify({ success: false, error: detailedError }), { status: 500, headers: corsHeaders });
    }

    const clientIp = await getClientIp(request);
    await logActivity({
      user_id: authState.user.id,
      user_name: authState.user.user_metadata?.full_name || authState.user.email || 'Admin',
      user_role: 'Quản trị viên',
      action_type: 'Cập nhật',
      action_text: `Quick update: ${field} của sản phẩm (slug: ${slug})`,
      module_name: 'Inventory',
      ip_address: clientIp
    });

    return new Response(JSON.stringify({ success: true, field, value: updateValue }), { headers: corsHeaders });
  } catch (err: any) {
    console.error('[products/quick-update] Unexpected error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Không thể lưu thay đổi sản phẩm' }), { status: 500, headers: corsHeaders });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
};
