import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { SessionManager } from '../../../lib/session-manager';

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('=== Testing Session Creation ===');
    
    // Test data
    const testUserId = 'test-user-id';
    const testSessionData = {
      device_name: 'Test Device',
      device_type: 'desktop' as 'desktop' | 'mobile' | 'tablet',
      browser: 'Chrome',
      ip_address: '127.0.0.1',
      location: 'Test Location',
      user_agent: 'Test Agent',
      refresh_token: 'test-refresh-token'
    };

    console.log('1. Creating test session...');
    const savedSession = await SessionManager.createSession(testUserId, testSessionData);
    
    if (savedSession) {
      console.log('✅ Test session created:', savedSession);
      
      // Test retrieving sessions
      console.log('2. Testing session retrieval...');
      const sessions = await SessionManager.getUserSessions(testUserId);
      console.log('✅ Retrieved sessions:', sessions.length);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Session creation test successful',
        session: savedSession,
        totalSessions: sessions.length
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      console.log('❌ Session creation failed');
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create test session'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
  } catch (error: any) {
    console.error('❌ Test API Error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({
      success: false,
      error: 'Test failed: ' + (error?.message || error)
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
