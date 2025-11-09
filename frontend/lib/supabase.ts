// =====================================================================
// Supabase Client Utility
// Description: Centralized Supabase client initialization
// Safe for SSR and client-side rendering
// =====================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables with safe fallbacks
const getEnvVar = (key: string, fallback: string): string => {
  if (typeof window !== 'undefined') {
    // Client-side: check window first, then process.env
    return (window as any)[`__${key}__`] || process.env[key] || fallback;
  }
  // Server-side: only use process.env
  return process.env[key] || fallback;
};

export const supabaseUrl = getEnvVar(
  'NEXT_PUBLIC_SUPABASE_URL',
  'https://placeholder-project.supabase.co'
);

export const supabaseAnonKey = getEnvVar(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyLXByb2plY3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTk5ODAwMCwiZXhwIjoxOTYxNTc0MDAwfQ.placeholder'
);

// Create Supabase client - safe for both SSR and client-side
// The 'use client' directive ensures this only runs on client-side
let supabaseInstance: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const isBrowser = typeof window !== 'undefined';

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
      storage: isBrowser ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'x-client-info': 'healthcare-portal@1.0.0',
      },
    },
  });

  return supabaseInstance;
}

// Export client instance
export const supabase: SupabaseClient = createSupabaseClient();

// Export getter function
export function getSupabaseClient(): SupabaseClient {
  return createSupabaseClient();
}
