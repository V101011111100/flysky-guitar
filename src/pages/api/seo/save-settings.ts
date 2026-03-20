import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();

    const {
      meta_title,
      meta_description,
      meta_keywords,
      gsc_id,
      ga4_id,
      fb_pixel_id
    } = payload;

    // Transform to key-value array for site_settings
    const settingsToUpdate = [
      { key: 'seo_meta_title', value: meta_title },
      { key: 'seo_meta_description', value: meta_description },
      { key: 'seo_meta_keywords', value: meta_keywords },
      { key: 'seo_gsc_id', value: gsc_id },
      { key: 'seo_ga4_id', value: ga4_id },
      { key: 'seo_fb_pixel_id', value: fb_pixel_id }
    ];

    // Upsert the values
    const result = await supabase
      .from('site_settings')
      .upsert(
        settingsToUpdate,
        { onConflict: 'key' }
      );

    if (result.error) {
      console.error('Lỗi khi lưu SEO settings:', result.error);
      return new Response(JSON.stringify({ success: false, error: result.error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('API Error (save-settings):', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

