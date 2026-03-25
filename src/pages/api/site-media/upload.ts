import type { APIRoute } from 'astro';
import { uploadToSupabaseStorage } from '../../../lib/storage';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin } from '../../../lib/security';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Định dạng không hỗ trợ. Chỉ dùng PNG, JPG, SVG, WebP.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return new Response(JSON.stringify({ error: 'File quá lớn. Tối đa 5MB.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToSupabaseStorage(buffer, file.name, file.type, 'branding');

    return new Response(JSON.stringify({ success: true, url: result.url, path: result.path }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Site-media upload error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Upload thất bại' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
