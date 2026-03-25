import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import webpush from 'web-push';
import { ensureSameOrigin } from '../../../lib/security';

const VAPID_PUBLIC_KEY  = import.meta.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE_KEY = import.meta.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT     = import.meta.env.VAPID_SUBJECT     || 'mailto:admin@flyskyguitar.com';

let vapidReady = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidReady = true;
  } catch {}
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const accessToken = cookies.get("sb-access-token");
    const refreshToken = cookies.get("sb-refresh-token");

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
    }

    // Get user's subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', authData.user.id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!vapidReady) {
      return new Response(
        JSON.stringify({ success: false, error: 'VAPID keys chưa được cấu hình. Vui lòng thêm VAPID_PUBLIC_KEY và VAPID_PRIVATE_KEY vào file .env' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Chưa có subscription nào. Hãy bật thông báo đẩy trước.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      title: '🎸 FlySky Guitar - Test Notification',
      body: 'Chúc mừng! Push notifications đang hoạt động tốt.',
      icon: '/logo.svg',
      badge: '/logo.svg',
      url: '/admin',
      tag: 'test-notification',
      requireInteraction: false
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          await webpush.sendNotification(pushSubscription, payload);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          console.error('Error sending to subscription:', error);
          
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
          
          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test notification sent! ${successful} successful, ${failed} failed`,
        sent: successful,
        failed: failed
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test notification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
