import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// One-shot migration: replace old private R2 domain with public domain in all product images
const OLD_DOMAIN = 'https://pub-2831f2deefd049618f0c23945c7ed734.r2.dev';
const NEW_DOMAIN = import.meta.env.R2_PUBLIC_URL || 'https://pub-cfcddb0e35794f1c8373c7fc48da82b1.r2.dev';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token");
    const refreshToken = cookies.get("sb-refresh-token");
    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Fetch all products
    const { data: products, error } = await supabase
      .from('products')
      .select('id, gallery_images');

    if (error) throw error;

    let updated = 0;
    for (const product of (products || [])) {
      let changed = false;
      let newGallery = product.gallery_images;

      if (Array.isArray(newGallery)) {
        const fixedGallery = newGallery.map((url: string) =>
          url.includes(OLD_DOMAIN) ? url.replace(OLD_DOMAIN, NEW_DOMAIN) : url
        );
        if (JSON.stringify(fixedGallery) !== JSON.stringify(newGallery)) {
          newGallery = fixedGallery;
          changed = true;
        }
      }

      if (changed) {
        await supabase
          .from('products')
          .update({ gallery_images: newGallery })
          .eq('id', product.id);
        updated++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Đã cập nhật ${updated}/${products?.length || 0} sản phẩm`,
      oldDomain: OLD_DOMAIN,
      newDomain: NEW_DOMAIN
    }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
