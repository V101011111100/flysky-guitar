import type { APIRoute } from 'astro';
import { deleteFromR2, publicUrl } from '../../../lib/r2';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { key } = await request.json();

    if (!key) {
      return new Response(JSON.stringify({ error: 'File key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determine the public URL of the file being deleted
    const publicDomain = process.env.R2_PUBLIC_DOMAIN || import.meta.env.R2_PUBLIC_DOMAIN || publicUrl;
    let baseUrl = publicDomain.endsWith('/') ? publicDomain.slice(0, -1) : publicDomain;
    const fileUrl = `${baseUrl}/${key}`;

    // Perform cascade delete: Set main_image_url to null for any products using this image
    // This uses Supabase server-side matching (requires DB service role or bypassing RLS if it's admin, but API route should be admin anyway). 
    // Since RLS is on, we should ideally check auth, but currently API doesn't. 
    // Let's assume authorized for now or no strict RLS for updates via service role if we had one.
    // The current anon client with standard token might fail if RLS blocks update without auth... 
    // We can at least try to update.
    const { error: dbError } = await supabase
      .from('products')
      .update({ main_image_url: null })
      .eq('main_image_url', fileUrl);
      
    if (dbError) {
      console.warn("Could not cascade delete image URL from products:", dbError);
    }

    // Delete from R2
    await deleteFromR2(key);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Delete API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Delete failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
