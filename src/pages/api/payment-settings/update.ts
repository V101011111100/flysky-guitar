import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin } from '../../../lib/security';

const VALID_PROVIDERS = ['bank_transfer', 'momo', 'vietqr', 'stripe', 'cash'] as const;
type Provider = typeof VALID_PROVIDERS[number];

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

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

    const body = await request.json();
    const { provider, enabled, config } = body;

    if (!provider || !VALID_PROVIDERS.includes(provider as Provider)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid provider' }), { status: 400 });
    }

    if (typeof enabled !== 'boolean') {
      return new Response(JSON.stringify({ success: false, error: 'enabled must be boolean' }), { status: 400 });
    }

    if (config !== undefined && (typeof config !== 'object' || Array.isArray(config))) {
      return new Response(JSON.stringify({ success: false, error: 'config must be an object' }), { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('payment_settings')
      .upsert(
        {
          provider,
          enabled,
          config: config ?? {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'provider' }
      );

    if (dbError) {
      console.error('payment_settings upsert error:', dbError);
      return new Response(JSON.stringify({ success: false, error: dbError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('API Error payment-settings/update:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
