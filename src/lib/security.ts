import { supabase } from './supabase';

const ADMIN_ROLE_VALUES = new Set(['admin', 'administrator', 'systemadmin', 'system_admin']);

function normalizeValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeValue(entry))
      .filter((entry): entry is string => Boolean(entry));
  }

  const single = normalizeValue(value);
  return single ? [single] : [];
}

function getConfiguredAdminEmails(): string[] {
  const configured = (import.meta.env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  // Backward-compatible default until ADMIN_EMAILS is configured explicitly.
  return ['admin@flyskyguitar.com'];
}

export function ensureSameOrigin(request: Request): { ok: true } | { ok: false; response: Response } {
  const origin = request.headers.get('origin');

  // Non-browser callers may not send Origin; do not block them by default.
  if (!origin) {
    return { ok: true };
  }

  const requestOrigin = new URL(request.url).origin;
  if (origin !== requestOrigin) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ success: false, error: 'Invalid origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { ok: true };
}

export const PENDING_MFA_REMEMBER_COOKIE = 'sb-mfa-remember';
export const ADMIN_SESSION_COOKIE = 'sb-admin-session';

export function isAdminUser(user: any): boolean {
  if (!user) return false;

  const roleValues = [
    ...normalizeStringList(user.app_metadata?.role),
    ...normalizeStringList(user.app_metadata?.user_role),
    ...normalizeStringList(user.app_metadata?.roles),
    ...normalizeStringList(user.user_metadata?.role),
    ...normalizeStringList(user.user_metadata?.user_role),
    ...normalizeStringList(user.user_metadata?.roles),
  ];

  if (roleValues.some((role) => ADMIN_ROLE_VALUES.has(role))) {
    return true;
  }

  const email = normalizeValue(user.email);
  return Boolean(email && getConfiguredAdminEmails().includes(email));
}

export async function getAdminMfaState(accessToken?: string, refreshToken?: string) {
  if (!accessToken || !refreshToken) {
    return {
      authenticated: false,
      isAdmin: false,
      requiresMfa: false,
      user: null,
    };
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.user) {
    return {
      authenticated: false,
      isAdmin: false,
      requiresMfa: false,
      user: null,
    };
  }

  const isAdmin = isAdminUser(data.user);
  const { data: assuranceData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const requiresMfa = isAdmin && assuranceData?.nextLevel === 'aal2' && assuranceData?.currentLevel !== 'aal2';

  return {
    authenticated: true,
    isAdmin,
    requiresMfa,
    user: data.user,
  };
}
