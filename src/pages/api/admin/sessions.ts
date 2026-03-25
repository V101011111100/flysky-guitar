import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { SessionManager } from '../../../lib/session-manager';
import { getClientIp } from '../../../lib/logger';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

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
    const currentRefreshToken = refreshToken.value;

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

    // Lấy thông tin request
    const userAgent = request.headers.get('user-agent') || '';
    const clientIP = await getClientIp(request);
    
    const deviceInfo = SessionManager.parseUserAgent(userAgent);
    
    // Lấy tất cả sessions của user từ custom session table
    const sessions = await SessionManager.getUserSessions(user.id);
    const activeSessions = sessions.filter((session) => session.is_active);
    
    // Debug: Kiểm tra xem có sessions không
    console.log('Sessions from database:', sessions);
    console.log('Sessions count:', sessions.length);
    
    let currentSession = activeSessions.find((session) =>
      Boolean(session.refresh_token) && session.refresh_token === currentRefreshToken
    );

    // Nếu chưa map được refresh token hiện tại vào session đang active, tạo mới session hiện tại.
    if (!currentSession) {
      console.log('Current refresh token is not mapped, creating current session...');

      const currentSessionData = {
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        ip_address: clientIP,
        location: 'TP. Hồ Chí Minh, VN',
        user_agent: userAgent,
        refresh_token: currentRefreshToken,
      };

      const newSession = await SessionManager.createSession(user.id, currentSessionData);
      if (newSession) {
        console.log('Current session created:', newSession.id);
        sessions.push(newSession);
        activeSessions.push(newSession);
        currentSession = newSession;
      }
    }

    // Cập nhật heartbeat cho phiên hiện tại để "Hoạt động lần cuối" luôn đúng.
    if (currentSession) {
      const nowIso = new Date().toISOString();
      await supabase
        .from('user_sessions')
        .update({
          device_name: deviceInfo.deviceName,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          ip_address: clientIP,
          user_agent: userAgent,
          refresh_token: currentRefreshToken,
          last_activity: nowIso,
        })
        .eq('id', currentSession.id)
        .eq('user_id', user.id);

      currentSession.device_name = deviceInfo.deviceName;
      currentSession.device_type = deviceInfo.deviceType;
      currentSession.browser = deviceInfo.browser;
      currentSession.ip_address = clientIP;
      currentSession.user_agent = userAgent;
      currentSession.refresh_token = currentRefreshToken;
      currentSession.last_activity = nowIso;
    }
    
    // Format sessions data cho frontend
    const fallbackCurrent = activeSessions[0] || sessions[0];
    const currentSessionId = currentSession?.id || fallbackCurrent?.id || '';

    const formattedSessions = sessions.map(session => ({
      sessionId: session.id,
      deviceName: session.device_name || deviceInfo.deviceName,
      browser: session.browser || deviceInfo.browser,
      deviceType: session.device_type || deviceInfo.deviceType,
      ipAddress: session.ip_address || clientIP,
      location: session.location || 'TP. Hồ Chí Minh, VN',
      lastActivity: session.last_activity,
      isActive: session.is_active,
      isCurrent: session.id === currentSessionId
    }));
    
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
