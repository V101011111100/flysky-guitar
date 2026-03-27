import type { APIRoute, AstroCookies } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { ADMIN_FEATURE_KEYS, parseAdminPermissionMap, type AdminFeatureKey } from '../../../lib/admin-permissions';
import { ensureSameOrigin, getAdminMfaState } from '../../../lib/security';
import { getClientIp, logActivity } from '../../../lib/logger';

const SETTINGS_KEY = 'flysky_admin_permissions';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getServiceRoleClient() {
  const url = import.meta.env.SUPABASE_URL || '';
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || !EMAIL_REGEX.test(normalized)) return null;
  return normalized;
}

function sanitizePermissionList(raw: unknown): AdminFeatureKey[] {
  if (!Array.isArray(raw)) return ['dashboard'];

  const out: AdminFeatureKey[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const key = item.trim() as AdminFeatureKey;
    if (!ADMIN_FEATURE_KEYS.includes(key)) continue;
    if (!out.includes(key)) out.push(key);
  }

  return out.length > 0 ? out : ['dashboard'];
}

async function requireAdmin(cookies: AstroCookies) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;
  const authState = await getAdminMfaState(accessToken, refreshToken);

  if (!authState.authenticated || !authState.isAdmin || authState.requiresMfa) {
    return {
      ok: false as const,
      response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
      email: '',
    };
  }

  return {
    ok: true as const,
    response: null,
    email: authState.user?.email?.trim().toLowerCase() || '',
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  const adminState = await requireAdmin(cookies);
  if (!adminState.ok) return adminState.response;

  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password.trim() : '';
  const permissions = sanitizePermissionList(body?.permissions);

  if (!email) {
    return new Response(JSON.stringify({ success: false, error: 'Email không hợp lệ' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (password.length < 8) {
    return new Response(JSON.stringify({ success: false, error: 'Mật khẩu phải từ 8 ký tự trở lên' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adminClient = getServiceRoleClient();
  if (!adminClient) {
    return new Response(JSON.stringify({ success: false, error: 'Thiếu cấu hình service role để tạo user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
    user_metadata: { role: 'admin' },
  });

  if (createError || !created?.user) {
    const message = String(createError?.message || 'Không thể tạo user');
    const status = /already|exists|registered/i.test(message) ? 409 : 500;
    return new Response(JSON.stringify({ success: false, error: createError?.message || 'Không thể tạo user' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: permissionSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();
  const permissionMap = parseAdminPermissionMap(permissionSetting?.value ?? null);
  permissionMap[email] = permissions;

  const { error: savePermissionError } = await supabase.from('site_settings').upsert(
    {
      key: SETTINGS_KEY,
      value: JSON.stringify(permissionMap),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );

  if (savePermissionError) {
    return new Response(JSON.stringify({ success: false, error: 'Không thể lưu phân quyền mặc định' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const clientIp = await getClientIp(request);
  await logActivity({
    user_name: adminState.email || 'Admin',
    user_role: 'Admin',
    action_type: 'Bảo mật / Hệ thống',
    action_text: `Tạo tài khoản nhân viên: ${email}`,
    module_name: 'System',
    ip_address: clientIp,
    details: {
      created_user_id: created.user.id,
      created_user_email: email,
      assigned_permissions: permissions,
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      email,
      permissions,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
