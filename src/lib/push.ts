import { supabase } from './supabase';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY  = import.meta.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE_KEY = import.meta.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT     = import.meta.env.VAPID_SUBJECT     || 'mailto:admin@flyskyguitar.com';

let vapidConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  } catch {}
}

export async function sendPushToAll(
  title: string,
  body: string,
  url = '/admin'
): Promise<void> {
  if (!vapidConfigured) return;

  try {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (!subscriptions || subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title,
      body,
      icon: '/logo.svg',
      badge: '/logo.svg',
      url,
      tag: 'flysky-notification',
      requireInteraction: false,
    });

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        }
      })
    );
  } catch {}
}
