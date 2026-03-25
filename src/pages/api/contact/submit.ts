import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { name, phone, content } = await request.json();

    if (!name?.trim() || !phone?.trim() || !content?.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Vui lòng điền đầy đủ thông tin.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase.from('contact_submissions').insert({
      name: name.trim(),
      phone: phone.trim(),
      content: content.trim(),
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Contact submit error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
