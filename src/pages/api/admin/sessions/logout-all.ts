import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { SessionManager } from '../../../../lib/session-manager';
import { ensureSameOrigin } from '../../../../lib/security';

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
    
    // Terminate ALL sessions (including current) for this user
    const sessions = await SessionManager.getUserSessions(authData.user.id);
    
    let allSuccess = true;
    for (const session of sessions) {
      const result = await SessionManager.terminateSession(session.id, authData.user.id);
      if (!result) allSuccess = false;
    }
    
    if (allSuccess || sessions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Đã đăng xuất khỏi tất cả các thiết bị thành công'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to logout from other sessions'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
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
