import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Check auth
  const accessToken = cookies.get("sb-access-token");
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { fields } = await request.json();
    if (!fields || typeof fields !== 'object') {
      return new Response(JSON.stringify({ error: "Invalid data" }), { status: 400 });
    }

    // Convert object to array for upsert
    const upsertData = Object.keys(fields).map((k) => ({
      key: k,
      value: fields[k] !== null ? String(fields[k]) : null,
      updated_at: new Date().toISOString()
    }));

    if (upsertData.length > 0) {
      const { error } = await supabase
        .from('site_settings')
        .upsert(upsertData, { onConflict: 'key' });

      if (error) {
        throw error;
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error: any) {
    console.error('Settings Update Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), { status: 500 });
  }
};
