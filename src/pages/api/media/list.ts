import type { APIRoute } from 'astro';
import { listR2Files } from '../../../lib/r2';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async () => {
  try {
    const files = await listR2Files('flysky-media/');
    // Sort by newest first
    files.sort((a: any, b: any) => {
      const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return dateB - dateA;
    });

    // Fetch all products to cross-reference images
    const { data: products } = await supabase
      .from('products')
      .select('id, name, main_image_url')
      .not('main_image_url', 'is', null);

    // Map files to products
    const enrichedFiles = files.map((file: any) => {
      let linkedProducts: string[] = [];
      if (products) {
        linkedProducts = products
          .filter(p => p.main_image_url === file.url)
          .map(p => p.name);
      }
      return { ...file, linkedProducts };
    });

    return new Response(JSON.stringify({ success: true, files: enrichedFiles }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('List API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to list files' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
