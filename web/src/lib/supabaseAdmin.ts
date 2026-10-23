import { createClient } from '@supabase/supabase-js';

// The Service Role key bypasses Row Level Security (RLS). 
// NEVER use this on the client side. ONLY use this in secure backend API routes (like webhooks).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-key';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
