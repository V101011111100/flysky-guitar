import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// Get columns of orders table from information_schema
export const GET: APIRoute = async () => {
  // Try using Supabase rpc with information_schema query
  let cols: string[] = [];
  
  // Approach 1: Use rpc exec_sql to query information_schema
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: `SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND table_schema = 'public' ORDER BY ordinal_position`
    });
    if (!error && data) {
      cols = data.map((r: any) => r.column_name);
      return new Response(JSON.stringify({ method: 'exec_sql', cols }), { status: 200 });
    }
  } catch (e) {}

  // Approach 2: Direct fetch with anon key
  const url = `${import.meta.env.SUPABASE_URL}/rest/v1/`;
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': import.meta.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.SUPABASE_ANON_KEY}`,
        'Accept': 'application/openapi+json'
      }
    });
    if (res.ok) {
      const schema = await res.json();
      const ordersDef = schema?.definitions?.orders;
      if (ordersDef) {
        cols = Object.keys(ordersDef.properties || {});
        return new Response(JSON.stringify({ method: 'openapi', cols, props: ordersDef.properties }), { status: 200 });
      }
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ method: 'openapi_fail', error: e.message }), { status: 200 });
  }

  return new Response(JSON.stringify({ method: 'none', cols }), { status: 200 });
};
