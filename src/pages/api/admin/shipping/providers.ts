import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { ensureSameOrigin } from '../../../../lib/security';

const PROVIDER_ALLOWLIST = new Set([
  'ghtk',
  'ghn',
  'viettel_post',
  'vnpost',
  'jnt',
  'self_delivery',
]);

function isSecretKey(key: string): boolean {
  return /(token|secret|password|api[_-]?key|access[_-]?key|refresh[_-]?token)/i.test(key);
}

function sanitizeConfig(config: unknown): unknown {
  if (!config || typeof config !== 'object') return {};
  if (Array.isArray(config)) return config.map((item) => sanitizeConfig(item));

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
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

function mergeConfigPreservingSecrets(current: unknown, incoming: unknown): Record<string, unknown> {
  const currentObj = current && typeof current === 'object' && !Array.isArray(current)
    ? (current as Record<string, unknown>)
    : {};
  const incomingObj = incoming && typeof incoming === 'object' && !Array.isArray(incoming)
    ? (incoming as Record<string, unknown>)
    : {};

  const merged: Record<string, unknown> = { ...currentObj };

  for (const [key, value] of Object.entries(incomingObj)) {
    const currentValue = currentObj[key];

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      currentValue &&
      typeof currentValue === 'object' &&
      !Array.isArray(currentValue)
    ) {
      merged[key] = mergeConfigPreservingSecrets(currentValue, value);
      continue;
    }

    if (isSecretKey(key) && typeof value === 'string' && value.trim() === '') {
      merged[key] = currentValue ?? '';
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

async function ensureAuthenticated(cookies: any) {
  const accessToken = cookies.get('sb-access-token');
  const refreshToken = cookies.get('sb-refresh-token');

  if (!accessToken || !refreshToken) return false;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken.value,
    refresh_token: refreshToken.value,
  });

  return !!data.user && !error;
}

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const isAuthed = await ensureAuthenticated(cookies);
    if (!isAuthed) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('shipping_providers')
      .select('id, provider_code, provider_name, enabled, config, updated_at')
      .order('provider_name', { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to load providers' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const providers = (data || []).map((provider: any) => ({
      ...provider,
      config: sanitizeConfig(provider.config),
    }));

    return new Response(JSON.stringify({ success: true, providers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const isAuthed = await ensureAuthenticated(cookies);
    if (!isAuthed) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const providerCode = String(body?.providerCode || '');
    const enabled = typeof body?.enabled === 'boolean' ? body.enabled : undefined;
    const config = body?.config;

    if (!PROVIDER_ALLOWLIST.has(providerCode)) {
      return new Response(JSON.stringify({ success: false, error: 'Provider không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: currentProvider, error: currentError } = await supabase
      .from('shipping_providers')
      .select('config')
      .eq('provider_code', providerCode)
      .single();

    if (currentError) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy provider' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof enabled === 'boolean') {
      payload.enabled = enabled;
    }

    if (config && typeof config === 'object' && !Array.isArray(config)) {
      payload.config = mergeConfigPreservingSecrets(currentProvider?.config, config);
    }

    const { data: updated, error: updateError } = await supabase
      .from('shipping_providers')
      .update(payload)
      .eq('provider_code', providerCode)
      .select('id, provider_code, provider_name, enabled, config, updated_at')
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ success: false, error: 'Cập nhật provider thất bại' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: {
          ...updated,
          config: sanitizeConfig(updated.config),
        },
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
