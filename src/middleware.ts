import type { MiddlewareHandler } from 'astro';
import { getAdminMfaState } from './lib/security';

function isAdminPage(pathname: string): boolean {
  return pathname.startsWith('/admin') && pathname !== '/admin/login';
}

function isAdminApi(pathname: string): boolean {
  return pathname.startsWith('/api/admin');
}

function isProtectedNonAdminApi(pathname: string, method: string): boolean {
  const protectedPrefixes = [
    '/api/media/',
    '/api/orders/',
    '/api/payment-settings',
    '/api/products/',
    '/api/settings/',
  ];

  const protectedExactRoutes = new Set([
    '/api/auth/create-session',
    '/api/email/test',
    '/api/notifications/send',
    '/api/notifications/subscribe',
    '/api/notifications/test',
    '/api/notifications/unsubscribe',
    '/api/orders/update-status',
    '/api/site-media/upload',
    '/api/upload',
  ]);

  if (protectedExactRoutes.has(pathname)) {
    return true;
  }

  if (pathname === '/api/customers/upsert') {
    return method !== 'GET';
  }

  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isAllowedPreMfaApi(pathname: string): boolean {
  return pathname === '/api/admin/mfa/status' || pathname === '/api/admin/mfa/verify';
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname } = new URL(context.request.url);
  const method = context.request.method.toUpperCase();

  if (!isAdminPage(pathname) && !isAdminApi(pathname) && !isProtectedNonAdminApi(pathname, method)) {
    return next();
  }

  if (pathname === '/admin/login' || isAllowedPreMfaApi(pathname)) {
    return next();
  }

  const accessToken = context.cookies.get('sb-access-token')?.value;
  const refreshToken = context.cookies.get('sb-refresh-token')?.value;
  const authState = await getAdminMfaState(accessToken, refreshToken);

  if (!authState.authenticated) {
    if (isAdminApi(pathname) || isProtectedNonAdminApi(pathname, method)) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return context.redirect('/admin/login');
  }

  if (!authState.isAdmin) {
    if (isAdminApi(pathname) || isProtectedNonAdminApi(pathname, method)) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return context.redirect('/admin/login');
  }

  if (!authState.requiresMfa) {
    return next();
  }

  if (isAdminApi(pathname) || isProtectedNonAdminApi(pathname, method)) {
    return new Response(JSON.stringify({ success: false, error: 'MFA verification required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return context.redirect('/admin/login');
};
