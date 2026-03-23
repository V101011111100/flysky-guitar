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
    
    // Terminate ALL sessions (including current) for this user
    const sessions = await SessionManager.getUserSessions(user.id);
    
    let allSuccess = true;
    for (const session of sessions) {
      const result = await SessionManager.terminateSession(session.id);
      if (!result) allSuccess = false;
    }
    
    if (allSuccess || sessions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Đã đăng xuất khỏi tất cả các thiết bị thành công'
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
