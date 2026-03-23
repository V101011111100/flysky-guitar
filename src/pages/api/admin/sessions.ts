import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { SessionManager } from '../../../lib/session-manager';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Lấy user hiện tại từ session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not authenticated'
      }), {
        status: 401,
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
    
    const deviceInfo = SessionManager.parseUserAgent(userAgent);
    
    // Lấy tất cả sessions của user từ custom session table
    const sessions = await SessionManager.getUserSessions(user.id);
    
    // Debug: Kiểm tra xem có sessions không
    console.log('Sessions from database:', sessions);
    console.log('Sessions count:', sessions.length);
    
    // Nếu không có sessions nào, tạo session hiện tại
    if (sessions.length === 0) {
      console.log('No sessions found, creating current session...');
      
      const currentSessionData = {
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        ip_address: clientIP,
        location: 'TP. Hồ Chí Minh, VN',
        user_agent: userAgent
      };
      
      const newSession = await SessionManager.createSession(user.id, currentSessionData);
      if (newSession) {
        console.log('Current session created:', newSession.id);
        sessions.push(newSession);
      }
    }
    
    // Thêm thông tin device hiện tại vào session nếu chưa có
    const currentSession = sessions.find(s => s.is_active);
    if (currentSession && !currentSession.device_name) {
      await supabase
        .from('user_sessions')
        .update({
          device_name: deviceInfo.deviceName,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          ip_address: clientIP,
          last_activity: new Date().toISOString()
        })
        .eq('id', currentSession.id);
    }
    
    // Format sessions data cho frontend
    const formattedSessions = sessions.map(session => ({
      sessionId: session.id,
      deviceName: session.device_name || deviceInfo.deviceName,
      browser: session.browser || deviceInfo.browser,
      deviceType: session.device_type || deviceInfo.deviceType,
      ipAddress: session.ip_address || clientIP,
      location: session.location || 'TP. Hồ Chí Minh, VN',
      lastActivity: session.last_activity,
      isCurrent: session.is_active
    }));
    
    return new Response(JSON.stringify({
      success: true,
      sessions: formattedSessions
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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
