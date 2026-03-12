import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Authenticate user via cookies
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

    // Parse the payload
    const payload = await request.json();
    const settings = payload.settings;

    if (!Array.isArray(settings)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid data format" }), { status: 400 });
    }

    // Perform an upsert on the site_settings table
    const { error: dbError } = await supabase
      .from('site_settings')
      .upsert(
        settings.map((s: { key: string, value: string }) => ({
          key: s.key,
          value: s.value
        })),
        { onConflict: 'key' }
      );

    if (dbError) {
      console.error("Supabase upsert error:", dbError);
      return new Response(JSON.stringify({ success: false, error: "Failed to update database" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error("API Error in settings/update:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
