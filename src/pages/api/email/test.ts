import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Auth check
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { test_email } = await request.json();

    if (!test_email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email address required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send test email using the send API
    const sendResponse = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: test_email,
        template_key: 'order_confirmation',
        variables: {
          order_number: 'TEST-001',
          total_amount: '1.000.000đ',
          customer_name: 'Test User',
          items: 'Test Product',
        },
      }),
    });

    const result = await sendResponse.json();

    return new Response(JSON.stringify(result), {
      status: sendResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
