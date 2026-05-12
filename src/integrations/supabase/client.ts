// This file is auto-generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://iikuixprsdulnrffedoi.supabase.co';

const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  'sb_publishable_AxI5fVtygNkltDTqgfSLtA_GbwfEcIx';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
});