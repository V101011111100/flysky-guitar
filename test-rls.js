import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/SUPABASE_URL\s*=\s*['"]?(.*?)['"]?(\r|\n|$)/);
const keyMatch = env.match(/SUPABASE_ANON_KEY\s*=\s*['"]?(.*?)['"]?(\r|\n|$)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkRLS() {
  // Test updating a specific review
  const testId = 'd9ee02bc-132f-43ab-a80b-f53afcef69e2'; // From user's log
  const { data, error, count } = await supabase
    .from('reviews')
    .update({ status: 'approved' })
    .eq('id', testId)
    .select();

  console.log("Error:", error);
  console.log("Updated rows:", data?.length);
  console.log("Data:", data);
}

checkRLS();
