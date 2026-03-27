import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin, getAdminMfaState } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;
    const authState = await getAdminMfaState(accessToken, refreshToken);
    if (!authState.authenticated || !authState.isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const icon = typeof body?.icon === 'string' ? body.icon.trim() : 'settings_suggest';

    if (!title) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu tên workflow' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase.from('marketing_workflows').insert({
      title,
      description,
      icon,
      is_active: false,
    });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
