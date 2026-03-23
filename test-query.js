import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/SUPABASE_URL\s*=\s*['"]?(.*?)['"]?(\r|\n|$)/);
const keyMatch = env.match(/SUPABASE_ANON_KEY\s*=\s*['"]?(.*?)['"]?(\r|\n|$)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function test() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("COLUMNS:", Object.keys(data[0] || {}));
  }
}
test();
