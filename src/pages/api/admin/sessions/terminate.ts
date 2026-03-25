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

    // Sử dụng SessionManager để terminate session
    const success = await SessionManager.terminateSession(sessionId, authData.user.id);
    
    if (success) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Session terminated successfully'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to terminate session'
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
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
