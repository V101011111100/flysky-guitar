import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { SessionManager } from '../../../lib/session-manager';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, deviceInfo, rememberMe } = body;
    
    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Lấy thông tin request
    const userAgent = request.headers.get('user-agent') || '';
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '127.0.0.1';
    
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
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create session'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
};
