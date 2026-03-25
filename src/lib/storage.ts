import { createClient } from '@supabase/supabase-js';

export const SITE_MEDIA_BUCKET = 'site-media';

// Use service role key so uploads bypass RLS (server-side only — never exposed to browser)
function getAdminClient() {
  const url = import.meta.env.SUPABASE_URL || '';
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình trong .env');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/**
 * Upload site/branding images (logo, hero, banners) to Supabase Storage.
 * Bucket: site-media (public)
 * Product images should still use uploadToR2() from r2.ts.
 */
export async function uploadToSupabaseStorage(
  fileData: Buffer | Uint8Array,
  fileName: string,
  contentType: string,
  folder: string = 'branding'
): Promise<{ url: string; path: string }> {
  const adminClient = getAdminClient();
  const fileKey = `${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  const { error } = await adminClient.storage
    .from(SITE_MEDIA_BUCKET)
    .upload(fileKey, fileData, { contentType, upsert: false });

  if (error) throw error;

  const { data: { publicUrl } } = adminClient.storage
    .from(SITE_MEDIA_BUCKET)
    .getPublicUrl(fileKey);

  return { url: publicUrl, path: fileKey };
}
