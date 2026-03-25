import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';

const SITE_MEDIA_BUCKET = 'site-media';

function getAdminClient() {
  const url = import.meta.env.SUPABASE_URL || '';
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** Recursively list all files in a Supabase Storage bucket folder. */
async function listAllFiles(adminClient: any, bucket: string, folder = '') {
  const { data, error } = await adminClient.storage.from(bucket).list(folder, {
    limit: 500,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error || !data) return [];

  const files: any[] = [];
  for (const item of data) {
    if (item.id === null) {
      // This is a "folder" placeholder — recurse into it
      const subPath = folder ? `${folder}/${item.name}` : item.name;
      const subFiles = await listAllFiles(adminClient, bucket, subPath);
      files.push(...subFiles);
    } else {
      const filePath = folder ? `${folder}/${item.name}` : item.name;
      const { data: { publicUrl } } = adminClient.storage.from(bucket).getPublicUrl(filePath);
      files.push({
        path: filePath,
        name: item.name,
        size: item.metadata?.size ?? 0,
        contentType: item.metadata?.mimetype ?? '',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        url: publicUrl,
        bucket,
      });
    }
  }
  return files;
}

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
    }

    const adminClient = getAdminClient();
    const files = await listAllFiles(adminClient, SITE_MEDIA_BUCKET);

    return new Response(JSON.stringify({ success: true, files, bucket: SITE_MEDIA_BUCKET }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('storage-list error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
