import type { APIRoute } from 'astro';
import { sendEmail } from '../../../lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { to, subject, html, text, templateKey } = await request.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu các trường bắt buộc: to, subject, html' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendEmail({ to, subject, html, text, templateKey });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
