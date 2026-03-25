import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin } from '../../../lib/security';

export const DELETE: APIRoute = async ({ request, params, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (originCheck) return originCheck;

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  const { error } = await supabase.from('print_templates').delete().eq('id', id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
