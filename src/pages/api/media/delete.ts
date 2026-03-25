import type { APIRoute } from 'astro';
import { deleteFromR2, publicUrl, bucketName } from '../../../lib/r2';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const originCheck = ensureSameOrigin(request);
    if (!originCheck.ok) return originCheck.response;

    // 1. Auth check - using same method as other admin APIs
    const accessToken = cookies.get("sb-access-token");
    const refreshToken = cookies.get("sb-refresh-token");

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - No session" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - Invalid session" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { key } = body;

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

    // Remove from gallery_images array
    // Get all products that have this image in gallery
    const { data: productsWithGallery } = await supabase
      .from('products')
      .select('id, gallery_images')
      .contains('gallery_images', [fileUrl]);

    if (productsWithGallery && productsWithGallery.length > 0) {
      // Remove the image from each product's gallery
      for (const product of productsWithGallery) {
        const newGallery = product.gallery_images.filter((img: string) => img !== fileUrl);
        const { error: dbError } = await supabase
          .from('products')
          .update({ gallery_images: newGallery.length > 0 ? newGallery : null })
          .eq('id', product.id);

        if (dbError) {
          console.warn("[DELETE] Could not update gallery_images:", dbError);
        }
      }
      console.log(`[DELETE] Updated ${productsWithGallery.length} products to remove image from gallery`);
    }

    // Delete from R2
    const deleteResult = await deleteFromR2(key);

    if (!deleteResult) {
      throw new Error('R2 delete returned false');
    }

    return new Response(JSON.stringify({
      success: true,
      message: `File ${key} deleted successfully`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[DELETE] Delete API Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Delete failed',
      details: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
