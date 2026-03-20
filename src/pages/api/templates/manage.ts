import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request, url, cookies }) => {
  const type = url.searchParams.get('type');
  if (!type) return new Response(JSON.stringify({ error: 'Missing type' }), { status: 400 });

  const { data, error } = await supabase
    .from('print_templates')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: false });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ templates: data }), { status: 200 });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  // auth check...
  try {
    const body = await request.json();
    const { id, name, type, settings, is_active } = body;
    
    if (!name || !type || !settings) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const payload: any = { name, type, settings };
    if (is_active !== undefined) payload.is_active = is_active;
    
    let result;
    if (id) {
      result = await supabase.from('print_templates').update(payload).eq('id', id).select().single();
    } else {
      result = await supabase.from('print_templates').insert([payload]).select().single();
    }

    if (result.error) throw result.error;
    
    return new Response(JSON.stringify({ success: true, template: result.data }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
