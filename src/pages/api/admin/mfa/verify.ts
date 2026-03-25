import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { ADMIN_SESSION_COOKIE, ensureSameOrigin, PENDING_MFA_REMEMBER_COOKIE } from '../../../../lib/security';
import { SessionManager } from '../../../../lib/session-manager';
import { getClientIp } from '../../../../lib/logger';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const isProduction = import.meta.env.PROD || import.meta.env.NODE_ENV === 'production';
    const useSecureCookies = isProduction ? true : new URL(request.url).protocol === 'https:';

    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken.value, refresh_token: refreshToken.value });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Chưa xác thực' }), { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { factorId, code } = body;

    if (!factorId || !code) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu factorId hoặc mã xác thực' }), { status: 400, headers: corsHeaders });
    }

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      return new Response(JSON.stringify({ success: false, error: 'Lỗi tạo challenge: ' + challengeError.message }), { status: 400, headers: corsHeaders });
    }

    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code
    });

    if (verifyError) {
      return new Response(JSON.stringify({ success: false, error: 'Mã xác thực không đúng' }), { status: 400, headers: corsHeaders });
    }

    const shouldPersistSession = cookies.get(PENDING_MFA_REMEMBER_COOKIE)?.value === '1';
    const maxAge = shouldPersistSession ? 30 * 24 * 60 * 60 : undefined;

    cookies.set('sb-access-token', verifyData.access_token, {
      path: '/',
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: 'lax',
      maxAge,
    });
    cookies.set('sb-refresh-token', verifyData.refresh_token, {
      path: '/',
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: 'lax',
      maxAge,
    });
    cookies.set('sb-session-type', shouldPersistSession ? 'persistent' : 'temporary', {
      path: '/',
      httpOnly: false,
      secure: useSecureCookies,
      sameSite: 'lax',
      maxAge,
    });
    cookies.delete(PENDING_MFA_REMEMBER_COOKIE, { path: '/' });

    if (shouldPersistSession) {
      const userAgent = request.headers.get('user-agent') || '';
      const clientIP = await getClientIp(request);
      const deviceInfo = SessionManager.parseUserAgent(userAgent);

      const savedSession = await SessionManager.createSession(user.id, {
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        ip_address: clientIP,
        location: 'TP. Hồ Chí Minh, VN',
        user_agent: userAgent,
        expires_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
      });

      if (savedSession?.session_token) {
        cookies.set(ADMIN_SESSION_COOKIE, savedSession.session_token, {
          path: '/',
          httpOnly: true,
          secure: useSecureCookies,
          sameSite: 'lax',
          maxAge,
        });
      } else {
        cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
      }
    } else {
      cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
    }

    return new Response(JSON.stringify({ success: true, tracked: shouldPersistSession, message: 'Đã kích hoạt 2FA thành công!' }), { headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Lỗi hệ thống' }), { status: 500, headers: corsHeaders });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};
