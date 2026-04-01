import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { ensureSameOrigin } from '../../../lib/security';
import { triggerCustomWorkflowEvent, triggerWelcomeSeriesWorkflow } from '../../../lib/marketing';

function getAdminClient() {
  const url = import.meta.env.SUPABASE_URL || '';
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function normalizeEmail(input: unknown): string {
  return typeof input === 'string' ? input.trim().toLowerCase() : '';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ success: false, error: 'Email không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const admin = getAdminClient();
    const now = new Date().toISOString();

    const { data: existing, error: existingErr } = await admin
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .maybeSingle();

    if (existingErr) {
      return new Response(JSON.stringify({ success: false, error: 'Không thể kiểm tra subscriber' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!existing) {
      const { error: insertErr } = await admin.from('newsletter_subscribers').insert({
        email,
        status: 'Đang hoạt động',
        joined_at: now,
      });

      if (insertErr) {
        return new Response(JSON.stringify({ success: false, error: 'Không thể đăng ký bản tin' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await triggerWelcomeSeriesWorkflow(admin, email);
      await triggerCustomWorkflowEvent(admin, 'newsletter_subscribed', email, {
        email,
        customer_name: body?.name || 'bạn',
      });

      return new Response(JSON.stringify({ success: true, state: 'subscribed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (existing.status === 'Đang hoạt động') {
      return new Response(JSON.stringify({ success: true, state: 'already_active' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: updateErr } = await admin
      .from('newsletter_subscribers')
      .update({ status: 'Đang hoạt động', joined_at: now })
      .eq('id', existing.id);

    if (updateErr) {
      return new Response(JSON.stringify({ success: false, error: 'Không thể kích hoạt lại đăng ký' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await triggerWelcomeSeriesWorkflow(admin, email);
    await triggerCustomWorkflowEvent(admin, 'newsletter_subscribed', email, {
      email,
      customer_name: body?.name || 'bạn',
    });

    return new Response(JSON.stringify({ success: true, state: 'reactivated' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
