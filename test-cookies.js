// Test if the review approve endpoint can be called directly with no cookies
// It should tell us what error we get
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/SUPABASE_URL\s*=\s*['"]?(.*?)['"]?(\r|\n|$)/);
const keyMatch = env.match(/SUPABASE_ANON_KEY\s*=\s*['"]?(.*?)['"]?(\r|\n|$)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

// Try to update a reviews row as anonymous (no auth)
async function test() {
  const { data, error } = await supabase
    .from('reviews')
    .update({ status: 'approved' })
    .eq('status', 'pending')
    .select('id');

  if (error) {
    console.log('Error updating as anon:', error.code, error.message);
  } else {
    console.log('Updated rows:', data?.length ?? 0);
  }
}

test();
