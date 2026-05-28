import { createClient } from '@supabase/supabase-js';

// .env.local dosyasındaki değişkenleri çekiyoruz
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Supabase istemcisini dışarı aktarıyoruz
export const supabase = createClient(supabaseUrl, supabaseKey);