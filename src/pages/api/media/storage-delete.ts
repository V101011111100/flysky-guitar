import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin } from '../../../lib/security';

const ALLOWED_BUCKETS = ['site-media'] as const;

function getAdminClient() {
  const url = import.meta.env.SUPABASE_URL || '';
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
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
    const { path, bucket } = body as { path?: string; bucket?: string };

    if (!path || typeof path !== 'string' || path.includes('..')) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid path' }), { status: 400 });
    }

    const targetBucket = (bucket as any) ?? 'site-media';
    if (!ALLOWED_BUCKETS.includes(targetBucket)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid bucket' }), { status: 400 });
    }

    const adminClient = getAdminClient();
    const { error } = await adminClient.storage.from(targetBucket).remove([path]);

    if (error) {
      console.error('storage-delete error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('storage-delete error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
