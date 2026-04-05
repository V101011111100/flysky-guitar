import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin, getAdminMfaState } from '../../../lib/security';
import { getClientIp, logActivity } from '../../../lib/logger';

const EDITABLE_SETTING_KEYS = new Set([
  'flysky_heroH1',
  'flysky_heroSub',
  'flysky_brand_section_tag',
  'flysky_brand_title1',
  'flysky_brand_title2',
  'flysky_brand_desc',
  'flysky_brand_feat1_title',
  'flysky_brand_feat1_desc',
  'flysky_brand_feat2_title',
  'flysky_brand_feat2_desc',
  'flysky_brand_image',
  'flysky_brand_images',
  'flysky_featured_section_tag',
  'flysky_featured_title',
  'flysky_featured_electric_vibe',
  'flysky_featured_electric_cta',
  'flysky_featured_electric_image',
  'flysky_featured_acoustic_vibe',
  'flysky_featured_acoustic_cta',
  'flysky_featured_acoustic_image',
  'flysky_featured_classic_vibe',
  'flysky_featured_classic_cta',
  'flysky_featured_classic_image',
  'flysky_featured_bass_vibe',
  'flysky_featured_bass_cta',
  'flysky_featured_bass_image',
  'flysky_featured_piano_vibe',
  'flysky_featured_piano_cta',
  'flysky_featured_piano_image',
  'flysky_featured_ukulele_vibe',
  'flysky_featured_ukulele_cta',
  'flysky_featured_ukulele_image',
  'flysky_about_hero_tag',
  'flysky_about_hero_h1',
  'flysky_about_hero_h1hi',
  'flysky_about_hero_desc',
  'flysky_about_hero_image',
  'flysky_about_hero_years',
  'flysky_about_hero_years_sub',
  'flysky_about_values_title',
  'flysky_about_values_desc',
  'flysky_about_val1_title',
  'flysky_about_val1_desc',
  'flysky_about_val2_title',
  'flysky_about_val2_desc',
  'flysky_about_val3_title',
  'flysky_about_val3_desc',
  'flysky_about_timeline_title',
  'flysky_about_timeline_desc',
  'flysky_about_timeline_items',
  'flysky_about_mile1_year',
  'flysky_about_mile1_title',
  'flysky_about_mile1_desc',
  'flysky_about_mile2_year',
  'flysky_about_mile2_title',
  'flysky_about_mile2_desc',
  'flysky_about_mile3_year',
  'flysky_about_mile3_title',
  'flysky_about_mile3_desc',
  'flysky_contact_page_tag',
  'flysky_contact_title',
  'flysky_contact_desc',
  'flysky_contact_store_title',
  'flysky_contact_store_desc',
  'flysky_contact_store_address',
  'flysky_contact_store_map_url',
  'flysky_contact_store_cta',
  'flysky_contact_store_image',
  'flysky_contact_phone_title',
  'flysky_contact_phone_desc',
  'flysky_contact_phone_number',
  'flysky_contact_phone_cta',
  'flysky_contact_email_title',
  'flysky_contact_email_desc',
  'flysky_contact_email_address',
  'flysky_contact_email_cta',
  'flysky_contact_form_title',
  'flysky_contact_form_desc',
  'flysky_contact_form_button',
  'flysky_contact_success_title',
  'flysky_contact_success_desc',
]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }

    const authState = await getAdminMfaState(accessToken.value, refreshToken.value);
    if (!authState.authenticated || !authState.user) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (!authState.isAdmin || authState.requiresMfa) {
      return json({ success: false, error: 'Forbidden' }, 403);
    }

    const body = await request.json();
    const key = typeof body?.key === 'string' ? body.key.trim() : '';
    const value = body?.value;

    if (!key || value === undefined || value === null) {
      return json({ success: false, error: 'Missing required fields' }, 400);
    }

    if (!EDITABLE_SETTING_KEYS.has(key)) {
      return json({ success: false, error: 'Setting is not editable' }, 400);
    }

    const stringValue = String(value).trim();
    if (!stringValue) {
      return json({ success: false, error: 'Value cannot be empty' }, 400);
    }

    if (stringValue.length > 5000) {
      return json({ success: false, error: 'Value is too long' }, 400);
    }

    const { error: dbError } = await supabase
      .from('site_settings')
      .upsert({
        key,
        value: stringValue,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (dbError) {
      return json({ success: false, error: 'Failed to save setting' }, 500);
    }

    const clientIp = await getClientIp(request);
    await logActivity({
      user_id: authState.user.id,
      user_name: authState.user.user_metadata?.full_name || authState.user.email || 'Admin',
      user_role: 'Quản trị viên',
      action_type: 'Cập nhật',
      action_text: `Quick update setting: ${key}`,
      module_name: 'Settings',
      ip_address: clientIp,
    });

    return json({ success: true, key, value: stringValue });
  } catch {
    return json({ success: false, error: 'Server error' }, 500);
  }
};

export const OPTIONS: APIRoute = async () => new Response(null, {
  status: 204,
  headers: {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
});
