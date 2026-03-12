import { createClient } from '@supabase/supabase-js';

// Các biến môi trường này cần được cung cấp trong file .env
// SUPABASE_URL=https://xyzcompany.supabase.co
// SUPABASE_ANON_KEY=public-anon-key

const supabaseUrl = import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || '';

// Khởi tạo Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
