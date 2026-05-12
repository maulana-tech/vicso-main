// This file is auto-generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 
  ((typeof window !== 'undefined' && (window as any).__ENV__?.VITE_SUPABASE_URL) as string) ||
  'https://iikuixprsdulnrffedoi.supabase.co';
  
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  ((typeof window !== 'undefined' && (window as any).__ENV__?.VITE_SUPABASE_PUBLISHABLE_KEY) as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmF1ZSIsInJlZiI6Imlpa3VpeHJzZHVsbnJmZmVkbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxOTU3MzQ1MjAwfQ.dummy_signature';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
});