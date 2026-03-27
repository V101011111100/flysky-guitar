import type { APIRoute, AstroCookies } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import {
  ADMIN_FEATURE_KEYS,
  enforceRootAdminFullAccess,
  parseAdminPermissionMap,
  type AdminPermissionMap,
  type AdminFeatureKey,
} from '../../../lib/admin-permissions';
import { ensureSameOrigin, getAdminMfaState } from '../../../lib/security';
import { getClientIp, logActivity } from '../../../lib/logger';

const SETTINGS_KEY = 'flysky_admin_permissions';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ACCOUNTS = 300;

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

function buildAccountList(permissionMap: AdminPermissionMap, currentAdminEmail: string, recentNames: unknown[] | null): string[] {
  const discovered = new Set<string>();

  if (currentAdminEmail) {
    discovered.add(currentAdminEmail);
  }

  for (const email of Object.keys(permissionMap)) {
    const normalized = normalizeEmail(email);
    if (normalized) discovered.add(normalized);
  }

  const envAdmins = String(import.meta.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => normalizeEmail(item))
    .filter((item): item is string => Boolean(item));
  for (const email of envAdmins) discovered.add(email);

  for (const name of recentNames || []) {
    const match = typeof name === 'string' ? name.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) : null;
    for (const rawEmail of match || []) {
      const normalized = normalizeEmail(rawEmail);
      if (normalized) discovered.add(normalized);
    }
  }

  return Array.from(discovered).sort((a, b) => a.localeCompare(b));
}

function getRootAdminEmails(): string[] {
  const configured = String(import.meta.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => normalizeEmail(item))
    .filter((item): item is string => Boolean(item));

  if (configured.length > 0) {
    return Array.from(new Set(configured));
  }

  return ['admin@flyskyguitar.com'];
}

async function getExistingAdminAccountsFromAuth(): Promise<string[]> {
  const adminClient = getServiceRoleClient();
  if (!adminClient) return [];

  const emails = new Set<string>();
  let page = 1;
  const perPage = 200;
  const maxPages = 5;

  while (page <= maxPages) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;

    for (const user of data.users) {
      const normalized = normalizeEmail(user.email || '');
      if (normalized) emails.add(normalized);
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return Array.from(emails);
}

export const GET: APIRoute = async ({ cookies }) => {
  const adminState = await requireAdmin(cookies);
  if (!adminState.ok) return adminState.response;

  const [{ data: settingData }, { data: activityData }, authAccounts] = await Promise.all([
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle(),
    supabase
      .from('activity_logs')
      .select('user_name')
      .order('created_at', { ascending: false })
      .limit(500),
    getExistingAdminAccountsFromAuth(),
  ]);

  const permissionMap = enforceRootAdminFullAccess(parseAdminPermissionMap(settingData?.value ?? null));
  const accounts = buildAccountList(
    permissionMap,
    adminState.email,
    (activityData || []).map((row: { user_name?: string | null }) => row.user_name ?? null),
  );

  for (const email of authAccounts || []) {
    if (!accounts.includes(email)) {
      accounts.push(email);
    }
  }
  accounts.sort((a, b) => a.localeCompare(b));

  return new Response(
    JSON.stringify({
      success: true,
      permissions: permissionMap,
      accounts,
      rootAdmins: getRootAdminEmails(),
      availableFeatures: ADMIN_FEATURE_KEYS,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};

function sanitizePermissionPayload(raw: unknown): AdminPermissionMap | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const result: AdminPermissionMap = {};
  const entries = Object.entries(raw as Record<string, unknown>);

  if (entries.length > MAX_ACCOUNTS) {
    return null;
  }

  for (const [rawEmail, rawFeatures] of entries) {
    const email = normalizeEmail(rawEmail);
    if (!email) continue;

    if (!Array.isArray(rawFeatures)) {
      result[email] = [];
      continue;
    }

    const features: AdminFeatureKey[] = [];
    for (const item of rawFeatures) {
      if (typeof item !== 'string') continue;
      const normalized = item.trim() as AdminFeatureKey;
      if (!ADMIN_FEATURE_KEYS.includes(normalized)) continue;
      if (!features.includes(normalized)) features.push(normalized);
    }

    result[email] = features;
  }

  return result;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  const adminState = await requireAdmin(cookies);
  if (!adminState.ok) return adminState.response;

  const payload = await request.json().catch(() => null);
  const sanitized = sanitizePermissionPayload(payload?.permissions);

  if (!sanitized) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: previousData } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();
  const previousMap = parseAdminPermissionMap(previousData?.value ?? null);

  const normalizedForSave = enforceRootAdminFullAccess(sanitized);

  const { error } = await supabase.from('site_settings').upsert(
    {
      key: SETTINGS_KEY,
      value: JSON.stringify(normalizedForSave),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );

  if (error) {
    return new Response(JSON.stringify({ success: false, error: 'Failed to save permissions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const changedEmails = Array.from(new Set([
    ...Object.keys(previousMap),
    ...Object.keys(normalizedForSave),
  ])).filter((email) => {
    const prev = JSON.stringify((previousMap[email] || []).slice().sort());
    const next = JSON.stringify((normalizedForSave[email] || []).slice().sort());
    return prev !== next;
  });

  const actorName = adminState.email || 'Admin';
  const clientIp = await getClientIp(request);
  await logActivity({
    user_name: actorName,
    user_role: 'Admin',
    action_type: 'Bảo mật / Hệ thống',
    action_text: `Cập nhật phân quyền (${changedEmails.length} tài khoản thay đổi)`,
    module_name: 'System',
    ip_address: clientIp,
    details: {
      changed_accounts: changedEmails,
      total_accounts: Object.keys(normalizedForSave).length,
    },
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
