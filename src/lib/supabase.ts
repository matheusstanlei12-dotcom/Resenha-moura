import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bwkzbkabvisqbelocdff.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_3dzUU2hGNdPLm1hQHeKJgg_gGGvvjf0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

// Access from console for maintenance/registration
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}
