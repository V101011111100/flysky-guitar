import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin, getAdminMfaState } from '../../../lib/security';
import { inferMarketingWorkflowKey } from '../../../lib/marketing';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;
    const authState = await getAdminMfaState(accessToken, refreshToken);
    if (!authState.authenticated || !authState.isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const icon = typeof body?.icon === 'string' ? body.icon.trim() : 'settings_suggest';
    const triggerEvent = typeof body?.triggerEvent === 'string' ? body.triggerEvent.trim() : null;
    const emailSubject = typeof body?.emailSubject === 'string' ? body.emailSubject.trim() : null;
    const emailBody = typeof body?.emailBody === 'string' ? body.emailBody.trim() : null;
    const workflowKey = inferMarketingWorkflowKey({ workflowKey: body?.workflowKey, title });

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu ID workflow' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!title) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu tên workflow' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (workflowKey === 'custom_manual' && (!triggerEvent || !emailSubject || !emailBody)) {
      return new Response(JSON.stringify({ success: false, error: 'Workflow custom cần trigger event, subject và body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let { error } = await supabase
      .from('marketing_workflows')
      .update({
        title,
        description,
        icon,
        workflow_key: workflowKey,
        trigger_event: triggerEvent,
        email_subject: emailSubject,
        email_body: emailBody,
      })
      .eq('id', id);

    if (error && /workflow_key|trigger_event|email_subject|email_body/i.test(error.message || '')) {
      const fallback = await supabase
        .from('marketing_workflows')
        .update({
          title,
          description,
          icon,
        })
        .eq('id', id);
      error = fallback.error;
    }

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
