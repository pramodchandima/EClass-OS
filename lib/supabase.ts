import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * PUBLIC SUPABASE CLIENT CONFIGURATION
 * These environment variables must be prefixed with 'NEXT_PUBLIC_' 
 * to be accessible on the client side.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public environment variables (URL or Anon Key).');
}

/**
 * SHARED PUBLIC SUPABASE CLIENT
 * Used for general database interactions, public actions, and client-side logic.
 * Note: For sensitive admin-only operations, use 'supabaseAdmin.ts' instead.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
