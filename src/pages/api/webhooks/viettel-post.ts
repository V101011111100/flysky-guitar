import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

type TrackingStatus = 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

const PROVIDER_CODE = 'viettel_post';

const PENDING_CODES = new Set(['-100', '100', '102', '103', '104', '-108', '-109', '-110']);
const PICKED_UP_CODES = new Set(['105']);
const IN_TRANSIT_CODES = new Set(['200', '202', '300', '320', '400']);
const OUT_FOR_DELIVERY_CODES = new Set(['500', '506', '570', '508', '509', '550']);
const DELIVERED_CODES = new Set(['501']);
const FAILED_CODES = new Set(['507']);
const RETURNED_CODES = new Set(['502', '504', '505', '515', '503', '201', '107', '-15', '510']);
const TERMINAL_CODES = new Set(['501', '503', '504', '201', '107', '-15']);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value || '').trim();
}

function parseViettelDateToIso(value: unknown): string | null {
  const raw = toStringValue(value);
  if (!raw) return null;

  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, dd, mm, yyyy, HH, MM, SS] = match;
  const parsed = new Date(`${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}+07:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function resolveTrackingStatus(code: string): TrackingStatus {
  if (PICKED_UP_CODES.has(code)) return 'picked_up';
  if (IN_TRANSIT_CODES.has(code)) return 'in_transit';
  if (OUT_FOR_DELIVERY_CODES.has(code)) return 'out_for_delivery';
  if (DELIVERED_CODES.has(code)) return 'delivered';
  if (FAILED_CODES.has(code)) return 'failed';
  if (RETURNED_CODES.has(code)) return 'returned';
  if (PENDING_CODES.has(code)) return 'pending';
  return 'in_transit';
}

function resolveOrderStatus(code: string, currentStatus: string | null): OrderStatus | null {
  if (code === '501') return 'completed';
  if (RETURNED_CODES.has(code) || code === '107' || code === '-15' || code === '201') return 'cancelled';

  if (!currentStatus || currentStatus === 'pending') {
    return 'processing';
  }

  if (currentStatus === 'completed' || currentStatus === 'cancelled') {
    return null;
  }

  return 'processing';
}

function getSupabaseAdminClient() {
  const url = import.meta.env.SUPABASE_URL || '';
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceKey) {
    throw new Error('Supabase service client is not configured');
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function getConfiguredWebhookSecret(
  supabaseAdmin: any
): Promise<string> {
  const envSecret = toStringValue(import.meta.env.VIETTEL_WEBHOOK_SECRET);
  if (envSecret) return envSecret;

  const { data } = await supabaseAdmin
    .from('shipping_providers')
    .select('config')
    .eq('provider_code', PROVIDER_CODE)
    .maybeSingle();

  const row = data as { config?: unknown } | null;

  const config = row?.config && typeof row.config === 'object' && !Array.isArray(row.config)
    ? (row.config as Record<string, unknown>)
    : {};

  const configSecret = toStringValue(config.webhook_secret || config.viettel_webhook_secret);
  return configSecret;
}

function getWebhookToken(request: Request, body: Record<string, unknown>): string {
  const auth = toStringValue(request.headers.get('authorization'));
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const fromHeaders =
    toStringValue(request.headers.get('token')) ||
    toStringValue(request.headers.get('x-viettel-token')) ||
    toStringValue(request.headers.get('x-webhook-token'));
  const fromBody = toStringValue(body.TOKEN);

  const url = new URL(request.url);
  const fromQuery = toStringValue(url.searchParams.get('token') || url.searchParams.get('secret'));

  return fromHeaders || bearer || fromBody || fromQuery;
}

export const GET: APIRoute = async () => {
  return json({
    success: true,
    provider: PROVIDER_CODE,
    message: 'Viettel webhook endpoint is ready',
  });
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ success: false, error: 'Invalid webhook payload' }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const data = body.DATA && typeof body.DATA === 'object' && !Array.isArray(body.DATA)
    ? (body.DATA as Record<string, unknown>)
    : body;

  const trackingNumber = toStringValue(data.ORDER_NUMBER);
  const orderReference = toStringValue(data.ORDER_REFERENCE);
  const orderStatusCode = toStringValue(data.ORDER_STATUS);
  const orderStatusDate = parseViettelDateToIso(data.ORDER_STATUSDATE);
  const currentLocation = toStringValue(data.LOCALION_CURRENTLY);
  const orderService = toStringValue(data.ORDER_SERVICE);
  const note = toStringValue(data.NOTE);

  if (!trackingNumber || !orderStatusCode) {
    return json({ success: false, error: 'Missing ORDER_NUMBER or ORDER_STATUS' }, 400);
  }

  const nowIso = new Date().toISOString();
  const trackingStatus = resolveTrackingStatus(orderStatusCode);

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const webhookSecret = await getConfiguredWebhookSecret(supabaseAdmin);

    if (!webhookSecret) {
      return json({ success: false, error: 'Webhook is not configured' }, 503);
    }

    const providedToken = getWebhookToken(request, body);
    if (!providedToken || providedToken !== webhookSecret) {
      return json({ success: false, error: 'Unauthorized webhook request' }, 401);
    }

    let orderRow: { id: string; status: string | null } | null = null;

    if (orderReference) {
      const orderByReference = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('order_number', orderReference)
        .maybeSingle();

      if (!orderByReference.error && orderByReference.data) {
        orderRow = orderByReference.data;
      }
    }

    if (!orderRow) {
      const orderByTracking = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('order_number', trackingNumber)
        .maybeSingle();

      if (!orderByTracking.error && orderByTracking.data) {
        orderRow = orderByTracking.data;
      }
    }

    const trackingLookup = await supabaseAdmin
      .from('shipping_trackings')
      .select('id, order_id, status, metadata')
      .eq('provider_code', PROVIDER_CODE)
      .eq('tracking_number', trackingNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (trackingLookup.error) {
      return json({ success: false, error: 'Unable to query tracking record' }, 500);
    }

    const existing = trackingLookup.data;
    const existingMetadata = existing?.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};

    const lastWebhook = existingMetadata.viettel_last_webhook;
    const lastWebhookObj = lastWebhook && typeof lastWebhook === 'object' && !Array.isArray(lastWebhook)
      ? (lastWebhook as Record<string, unknown>)
      : null;

    const isDuplicate =
      toStringValue(lastWebhookObj?.status_code) === orderStatusCode &&
      toStringValue(lastWebhookObj?.status_date) === toStringValue(orderStatusDate);

    if (isDuplicate) {
      return json({ success: true, duplicate: true, trackingNumber, orderStatusCode });
    }

    const nextMetadata = {
      ...existingMetadata,
      viettel_last_webhook: {
        status_code: orderStatusCode,
        status_date: orderStatusDate,
        status_terminal: TERMINAL_CODES.has(orderStatusCode),
        order_reference: orderReference || null,
        order_service: orderService || null,
        received_at: nowIso,
      },
    };

    const basePayload = {
      order_id: existing?.order_id || orderRow?.id || null,
      provider_code: PROVIDER_CODE,
      tracking_number: trackingNumber,
      status: trackingStatus,
      current_location: currentLocation || note || null,
      actual_delivery: trackingStatus === 'delivered' ? (orderStatusDate || nowIso) : null,
      updated_at: nowIso,
      metadata: nextMetadata,
    };

    if (existing?.id) {
      const updateRes = await supabaseAdmin
        .from('shipping_trackings')
        .update(basePayload)
        .eq('id', existing.id)
        .select('id, order_id, tracking_number, status, updated_at')
        .single();

      if (updateRes.error) {
        return json({ success: false, error: 'Unable to update tracking record' }, 500);
      }
    } else {
      const insertRes = await supabaseAdmin
        .from('shipping_trackings')
        .insert(basePayload)
        .select('id, order_id, tracking_number, status, updated_at')
        .single();

      if (insertRes.error) {
        return json({ success: false, error: 'Unable to create tracking record' }, 500);
      }
    }

    if (orderRow?.id) {
      const nextOrderStatus = resolveOrderStatus(orderStatusCode, toStringValue(orderRow.status));
      if (nextOrderStatus && nextOrderStatus !== orderRow.status) {
        await supabaseAdmin
          .from('orders')
          .update({ status: nextOrderStatus, updated_at: nowIso })
          .eq('id', orderRow.id);
      }
    }

    return json({
      success: true,
      trackingNumber,
      orderReference: orderReference || null,
      orderStatusCode,
      trackingStatus,
      terminal: TERMINAL_CODES.has(orderStatusCode),
    });
  } catch {
    return json({ success: false, error: 'Internal server error' }, 500);
  }
};