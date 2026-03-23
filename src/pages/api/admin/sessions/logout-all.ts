import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { SessionManager } from '../../../../lib/session-manager';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Lấy user hiện tại để xác thực quyền
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
    
    // Lấy current session ID để giữ lại
    const sessions = await SessionManager.getUserSessions(user.id);
    const currentSession = sessions.find(s => s.is_active);
    const currentSessionId = currentSession?.id;
    
    if (!currentSessionId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No active session found'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Sử dụng SessionManager để terminate tất cả sessions khác
    const success = await SessionManager.terminateAllOtherSessions(user.id, currentSessionId);
    
    if (success) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Đã đăng xuất khỏi tất cả các thiết bị khác thành công'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to logout from other sessions'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
  } catch (error) {
    console.error('Logout All Sessions Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to logout from all sessions'
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
