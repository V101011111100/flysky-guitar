import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { SessionManager } from '../../../lib/session-manager';
import { getClientIp } from '../../../lib/logger';
import { ADMIN_SESSION_COOKIE } from '../../../lib/security';

function sessionFingerprint(session: {
  device_name?: string;
  browser?: string;
  device_type?: string;
  ip_address?: string;
  user_agent?: string;
}): string {
  return [
    session.device_name || '',
    session.browser || '',
    session.device_type || '',
    session.ip_address || '',
    session.user_agent || '',
  ].join('|');
}

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');
    const sessionType = cookies.get('sb-session-type')?.value || 'temporary';
    const currentSessionToken = cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const shouldTrackCurrentSession = sessionType === 'persistent';
    const isProduction = import.meta.env.PROD || import.meta.env.NODE_ENV === 'production';
    const useSecureCookies = isProduction ? true : new URL(request.url).protocol === 'https:';
    const persistentMaxAge = 30 * 24 * 60 * 60;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    const user = authData?.user;
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const userAgent = request.headers.get('user-agent') || '';
    const clientIP = await getClientIp(request);
    const deviceInfo = SessionManager.parseUserAgent(userAgent);

    const sessions = await SessionManager.getUserSessions(user.id);
    const activeSessions = sessions.filter((session) => session.is_active);

    let currentSession = shouldTrackCurrentSession && currentSessionToken
      ? activeSessions.find((session) => session.session_token === currentSessionToken)
      : undefined;

    const reusableCurrent = shouldTrackCurrentSession && !currentSession
      ? activeSessions.find((session) =>
          (session.user_agent && session.user_agent === userAgent) ||
          (
            (session.device_name || '') === deviceInfo.deviceName &&
            (session.browser || '') === deviceInfo.browser &&
            (session.device_type || '') === deviceInfo.deviceType &&
            (session.ip_address || '') === clientIP
          )
        )
      : undefined;

    if (shouldTrackCurrentSession && !currentSession && reusableCurrent) {
      currentSession = reusableCurrent;
    }

    if (shouldTrackCurrentSession && !currentSession) {
      const newSession = await SessionManager.createSession(user.id, {
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        ip_address: clientIP,
        location: 'TP. Hồ Chí Minh, VN',
        user_agent: userAgent,
        expires_at: new Date(Date.now() + (persistentMaxAge * 1000)).toISOString(),
      });

      if (newSession) {
        sessions.push(newSession);
        activeSessions.push(newSession);
        currentSession = newSession;
      }
    }

    if (shouldTrackCurrentSession && currentSession) {
      const nowIso = new Date().toISOString();
      await supabase
        .from('user_sessions')
        .update({
          device_name: deviceInfo.deviceName,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          ip_address: clientIP,
          user_agent: userAgent,
          last_activity: nowIso,
        })
        .eq('id', currentSession.id)
        .eq('user_id', user.id);

      currentSession.device_name = deviceInfo.deviceName;
      currentSession.device_type = deviceInfo.deviceType;
      currentSession.browser = deviceInfo.browser;
      currentSession.ip_address = clientIP;
      currentSession.user_agent = userAgent;
      currentSession.last_activity = nowIso;

      cookies.set(ADMIN_SESSION_COOKIE, currentSession.session_token, {
        path: '/',
        httpOnly: true,
        secure: useSecureCookies,
        sameSite: 'lax',
        maxAge: persistentMaxAge,
      });
    }

    const fallbackCurrent = shouldTrackCurrentSession ? (activeSessions[0] || sessions[0]) : undefined;
    const currentSessionId = shouldTrackCurrentSession ? (currentSession?.id || fallbackCurrent?.id || '') : '';
    const currentFingerprint = currentSession ? sessionFingerprint(currentSession) : '';

    if (shouldTrackCurrentSession && currentSession && currentFingerprint) {
      for (const session of activeSessions) {
        if (session.id === currentSession.id) continue;
        if (sessionFingerprint(session) !== currentFingerprint) continue;

        await SessionManager.terminateSession(session.id, user.id);
        session.is_active = false;
      }
    }

    const visibleSessions = sessions.filter((session) => {
      if (session.is_active) return true;
      if (!shouldTrackCurrentSession || !currentFingerprint) return true;
      return sessionFingerprint(session) !== currentFingerprint;
    });

    const formattedSessions = visibleSessions.map(session => ({
      sessionId: session.id,
      deviceName: session.device_name || deviceInfo.deviceName,
      browser: session.browser || deviceInfo.browser,
      deviceType: session.device_type || deviceInfo.deviceType,
      ipAddress: session.ip_address || clientIP,
      location: session.location || 'TP. Hồ Chí Minh, VN',
      lastActivity: session.last_activity,
      isActive: session.is_active,
      isCurrent: session.id === currentSessionId,
      sessionKind: 'persistent'
    }));

    if (!shouldTrackCurrentSession) {
      formattedSessions.unshift({
        sessionId: 'current-temporary-session',
        deviceName: deviceInfo.deviceName,
        browser: deviceInfo.browser,
        deviceType: deviceInfo.deviceType,
        ipAddress: clientIP,
        location: 'TP. Hồ Chí Minh, VN',
        lastActivity: new Date().toISOString(),
        isActive: true,
        isCurrent: true,
        sessionKind: 'temporary'
      });
    }

    return new Response(JSON.stringify({
      success: true,
      sessions: formattedSessions
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Sessions API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to load sessions'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
};
