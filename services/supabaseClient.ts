import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let finalUrl = 'https://dummy.supabase.co';
if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
  finalUrl = rawUrl;
}

if (!rawUrl || !rawKey || finalUrl === 'https://dummy.supabase.co') {
    console.warn('Supabase URL or Anon Key is missing or invalid. Check your .env.local file (or environment variables in production).');
}

// Use a dummy valid URL and key to prevent the app from crashing on load if env vars are missing
export const supabase = createClient(
  finalUrl, 
  rawKey || 'dummy-key'
);
