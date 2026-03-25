import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';

function isSecretKey(key: string): boolean {
  return /(token|secret|password|api[_-]?key|access[_-]?key|refresh[_-]?token)/i.test(key);
}

function sanitizeConfig(config: unknown): unknown {
  if (!config || typeof config !== 'object') return {};

  if (Array.isArray(config)) {
    return config.map((item) => sanitizeConfig(item));
  }

  const input = config as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value && typeof value === 'object') {
      output[key] = sanitizeConfig(value);
      continue;
    }

    if (isSecretKey(key) && typeof value === 'string' && value.trim()) {
      output[key] = '********';
      continue;
    }

    output[key] = value;
  }

  return output;
}

export const GET: APIRoute = async ({ cookies }) => {
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

    const [providersRes, ratesRes, trackingsRes, ordersRes] = await Promise.all([
      supabase
        .from('shipping_providers')
        .select('id, provider_code, provider_name, enabled, config, updated_at')
        .order('provider_name', { ascending: true }),
      supabase
        .from('shipping_rates')
        .select('id, provider_code, from_province, to_province, weight_from, weight_to, base_fee, per_kg_fee, enabled, updated_at')
        .order('updated_at', { ascending: false })
        .limit(100),
      supabase
        .from('shipping_trackings')
        .select('id, order_id, provider_code, tracking_number, status, current_location, estimated_delivery, updated_at, created_at, order:orders(order_number, customer_name, customer_phone, total_amount)')
        .order('updated_at', { ascending: false })
        .limit(30),
      supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    if (providersRes.error || ratesRes.error || trackingsRes.error || ordersRes.error) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to load shipping dashboard' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const providers = (providersRes.data || []).map((provider: any) => ({
      ...provider,
      config: sanitizeConfig(provider.config),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        providers,
        rates: ratesRes.data || [],
        trackings: trackingsRes.data || [],
        orders: ordersRes.data || [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
