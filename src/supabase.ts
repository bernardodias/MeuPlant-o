import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Clean URLs and Keys from whitespace or trailing slashes
const supabaseUrl = rawUrl?.trim().replace(/\/$/, "");
const supabaseAnonKey = rawKey?.trim();

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

// Only create the client if we have the credentials to avoid crashing the app
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;
