import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (originCheck) return originCheck;

  try {
    const { id, type } = await request.json();
    if (!id || !type) return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });

    const { error } = await supabase
      .from('print_templates')
      .update({ is_active: true })
      .eq('id', id)
      .eq('type', type);

    if (error) throw error;
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
