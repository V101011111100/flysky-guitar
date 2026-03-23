import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { logActivity, getClientIp } from '../../../lib/logger';

export const POST: APIRoute = async ({ request, cookies }) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    // Auth check
    const accessToken = cookies.get("sb-access-token");
    const refreshToken = cookies.get("sb-refresh-token");

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { slug, field, value } = body;

    if (!slug || !field || value === undefined) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }

    // Whitelist allowed fields for inline editing
    const allowedFields: Record<string, string> = {
      'name': 'name',
      'price': 'price',
      'description': 'description',
    };

    const dbField = allowedFields[field];
    if (!dbField) {
      return new Response(JSON.stringify({ success: false, error: `Field '${field}' is not editable` }), { status: 400, headers: corsHeaders });
    }

    // Parse value based on field type
    let parsedValue: any = value;
    if (field === 'price') {
      parsedValue = parseInt(String(value).replace(/\D/g, ''), 10);
      if (isNaN(parsedValue) || parsedValue < 0) {
        return new Response(JSON.stringify({ success: false, error: "Giá không hợp lệ" }), { status: 400, headers: corsHeaders });
      }
    }

    // Update
    const { error } = await supabase
      .from('products')
      .update({ [dbField]: parsedValue })
      .eq('slug', slug);

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }

    // Log activity
    const clientIp = await getClientIp(request);
    await logActivity({
      user_id: authData.user.id,
      user_name: authData.user.user_metadata?.full_name || authData.user.email || 'Admin',
      user_role: 'Quản trị viên',
      action_type: 'Cập nhật',
      action_text: `Inline edit: ${field} của sản phẩm (slug: ${slug})`,
      module_name: 'Inventory',
      ip_address: clientIp
    });

    return new Response(JSON.stringify({ success: true, field, value: parsedValue }), { headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
};
