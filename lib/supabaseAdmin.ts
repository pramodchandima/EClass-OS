import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ADMIN SUPABASE CLIENT CONFIGURATION
 * These environment variables must be kept secure and only exposed server-side.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase admin environment variables (URL or Service Role Key).');
}

/**
 * PRIVILEGED SUPABASE ADMIN CLIENT (Server-Side Only)
 * Uses the Service Role Key to bypass Row-Level Security (RLS).
 * 
 * [!] WARNING: This client should NEVER be used in client-side code.
 * It is intended for protected /api routes and background bot logic.
 */
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
