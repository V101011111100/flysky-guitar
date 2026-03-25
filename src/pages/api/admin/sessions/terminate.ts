import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { SessionManager } from '../../../../lib/session-manager';
import { ADMIN_SESSION_COOKIE, ensureSameOrigin } from '../../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');
    const currentSessionToken = cookies.get(ADMIN_SESSION_COOKIE)?.value;

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
    const { sessionId } = body;

    if (!sessionId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Session ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const { data: targetSession, error: targetError } = await supabase
      .from('user_sessions')
      .select('id, is_active, session_token')
      .eq('id', sessionId)
      .eq('user_id', authData.user.id)
      .single();

    if (targetError || !targetSession) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Session not found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const forceLogout = Boolean(currentSessionToken) && targetSession.session_token === currentSessionToken;

    if (targetSession.is_active) {
      const terminated = await SessionManager.terminateSession(sessionId, authData.user.id);

      if (!terminated) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to terminate session'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      if (forceLogout) {
        cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
      }

      return new Response(JSON.stringify({
        success: true,
        action: 'terminated',
        forceLogout,
        message: 'Đã kết thúc phiên thành công'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const { error: deleteError } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', authData.user.id);

    if (deleteError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to delete session'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    if (forceLogout) {
      cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
    }

    return new Response(JSON.stringify({
      success: true,
      action: 'deleted',
      forceLogout,
      message: 'Đã xóa phiên khỏi danh sách'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Terminate Session Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to terminate session'
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
