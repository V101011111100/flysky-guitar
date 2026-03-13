import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env manually to avoid dependencies
const envConfig = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envConfig.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    // Remove quotes
    value = value.replace(/(^['"]|['"]$)/g, '').trim();
    envVars[key] = value;
  }
});

const supabaseUrl = envVars['SUPABASE_URL'] || '';
const supabaseKey = envVars['SUPABASE_ANON_KEY'] || ''; 

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FALLBACK_URL = 'https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&q=80';

async function fixImages() {
  console.log("Fixing broken '1596568359535' images...");

  const { data: exactMatches1, error: err1 } = await supabase
    .from('products')
    .select('id, name, main_image_url')
    .ilike('main_image_url', '%1596568359535%');

  if (err1) {
    console.error("Error fetching exact matches 1:", err1);
    return;
  }
  
  const { data: exactMatches2, error: err2 } = await supabase
    .from('products')
    .select('id, name, main_image_url')
    .ilike('main_image_url', '%1596484552834%');

  const matchesToUpdate = [...(exactMatches1 || []), ...(exactMatches2 || [])];

  console.log(`Found ${matchesToUpdate.length} products with the broken URLs.`);

  for (const product of matchesToUpdate) {
    console.log(`Updating product: ${product.name} (${product.id})`);
    
    // Using service role key or just trying with anon key since policies allow updates by auth.
    // Wait, the policy says: "Allow admin full access on products" on public.products for all using (auth.role() = 'authenticated');
    // So anon key cannot update! We MUST use the service role key or login.
    // Does the .env have SUPABASE_SERVICE_ROLE_KEY?
    const serviceKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];
    if (serviceKey) {
       const adminSupabase = createClient(supabaseUrl, serviceKey);
       const { error: updateErr } = await adminSupabase
        .from('products')
        .update({ main_image_url: FALLBACK_URL })
        .eq('id', product.id);

      if (updateErr) {
        console.error(`Failed to update ${product.name}:`, updateErr.message);
      } else {
        console.log(`Successfully updated ${product.name}`);
      }
    } else {
        console.log("SUPABASE_SERVICE_ROLE_KEY not found. Attempting update with anon key (will likely fail on RLS)...");
        const { error: updateErr } = await supabase
        .from('products')
        .update({ main_image_url: FALLBACK_URL })
        .eq('id', product.id);

      if (updateErr) {
        console.error(`Failed to update ${product.name}:`, updateErr.message);
      } else {
        console.log(`Successfully updated ${product.name}`);
      }
    }
  }

  console.log("Finished db replacement.");
}

fixImages();
