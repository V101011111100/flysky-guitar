import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { ensureSameOrigin } from '../../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id, action } = await request.json();

    if (!id || !action) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'approve') {
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, message: 'Đã duyệt đánh giá' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: 'Đã xoá đánh giá' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Action error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Lỗi server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
