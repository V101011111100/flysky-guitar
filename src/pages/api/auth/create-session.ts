import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { SessionManager } from '../../../lib/session-manager';
import { ensureSameOrigin } from '../../../lib/security';
import { getClientIp } from '../../../lib/logger';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

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

    if (authError || !authData.user) {
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

    const body = await request.json();
    const { deviceInfo, rememberMe } = body;
    const userId = authData.user.id;

    // Lấy thông tin request
    const userAgent = request.headers.get('user-agent') || '';
    const clientIP = await getClientIp(request);
    
    const parsedDevice = SessionManager.parseUserAgent(userAgent);
    
    const sessionData = {
      device_name: deviceInfo?.deviceName || parsedDevice.deviceName,
      device_type: deviceInfo?.deviceType || parsedDevice.deviceType,
      browser: deviceInfo?.browser || parsedDevice.browser,
      ip_address: clientIP,
      location: deviceInfo?.location || 'TP. Hồ Chí Minh, VN',
      user_agent: userAgent,
      expires_at: rememberMe 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    const savedSession = await SessionManager.createSession(userId, sessionData);
    
    if (savedSession) {
      return new Response(JSON.stringify({
        success: true,
        session: {
          sessionId: savedSession.id,
          deviceName: savedSession.device_name,
          browser: savedSession.browser,
          deviceType: savedSession.device_type,
          ipAddress: savedSession.ip_address,
          location: savedSession.location,
          lastActivity: savedSession.last_activity,
          expiresAt: savedSession.expires_at
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create session'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
  } catch (error) {
    console.error('Create Session Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create session'
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
