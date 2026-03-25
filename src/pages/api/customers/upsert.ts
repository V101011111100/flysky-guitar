import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin } from '../../../lib/security';

// POST: upsert a customer's display_name (admin-set official name)
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

    const { phone, display_name, note } = await request.json();
    if (!phone) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu số điện thoại' }), { status: 400 });
    }

    // Upsert into customers table
    const { error } = await supabase
      .from('customers')
      .upsert(
        {
          phone,
          display_name: display_name?.trim() || null,
          note: note?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phone' }
      );

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('Customer upsert error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};

// GET: fetch customer by phone
export const GET: APIRoute = async ({ url }) => {
  const phone = url.searchParams.get('phone');
  if (!phone) return new Response(JSON.stringify({ customer: null }), { status: 200 });

  const { data, error } = await supabase
    .from('customers')
    .select('phone, display_name, note')
    .eq('phone', phone)
    .maybeSingle();

  return new Response(JSON.stringify({ customer: data, error: error?.message }), { status: 200 });
};
