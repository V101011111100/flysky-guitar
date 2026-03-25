import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { ensureSameOrigin } from '../../../../lib/security';

const PROVIDER_ALLOWLIST = new Set([
  'ghtk',
  'ghn',
  'viettel_post',
  'vnpost',
  'jnt',
  'self_delivery',
]);

const TRACKING_STATUS_ALLOWLIST = new Set([
  'pending',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'returned',
]);

async function ensureAuthenticated(cookies: any) {
  const accessToken = cookies.get('sb-access-token');
  const refreshToken = cookies.get('sb-refresh-token');

  if (!accessToken || !refreshToken) return false;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken.value,
    refresh_token: refreshToken.value,
  });

  return !!data.user && !error;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const isAuthed = await ensureAuthenticated(cookies);
    if (!isAuthed) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const orderId = String(body?.orderId || '');
    const providerCode = String(body?.providerCode || '');
    const trackingNumber = String(body?.trackingNumber || '').trim();
    const status = String(body?.status || 'pending');
    const currentLocation = String(body?.currentLocation || '').trim();
    const estimatedDelivery = body?.estimatedDelivery ? new Date(body.estimatedDelivery) : null;

    if (!orderId || !providerCode || !trackingNumber) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu thông tin bắt buộc' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!PROVIDER_ALLOWLIST.has(providerCode)) {
      return new Response(JSON.stringify({ success: false, error: 'Provider không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!TRACKING_STATUS_ALLOWLIST.has(status)) {
      return new Response(JSON.stringify({ success: false, error: 'Trạng thái tracking không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: orderExists, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !orderExists) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy đơn hàng' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: existingTracking } = await supabase
      .from('shipping_trackings')
      .select('id')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      order_id: orderId,
      provider_code: providerCode,
      tracking_number: trackingNumber,
      status,
      current_location: currentLocation || null,
      estimated_delivery: estimatedDelivery ? estimatedDelivery.toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    let trackingResult;
    if (existingTracking?.id) {
      trackingResult = await supabase
        .from('shipping_trackings')
        .update(payload)
        .eq('id', existingTracking.id)
        .select('id, order_id, provider_code, tracking_number, status, current_location, estimated_delivery, updated_at')
        .single();
    } else {
      trackingResult = await supabase
        .from('shipping_trackings')
        .insert(payload)
        .select('id, order_id, provider_code, tracking_number, status, current_location, estimated_delivery, updated_at')
        .single();
    }

    if (trackingResult.error) {
      return new Response(JSON.stringify({ success: false, error: 'Không thể lưu tracking' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (orderExists.status === 'pending') {
      await supabase
        .from('orders')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', orderId);
    }

    return new Response(JSON.stringify({ success: true, tracking: trackingResult.data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
