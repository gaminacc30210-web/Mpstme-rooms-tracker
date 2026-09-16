const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from your .env file");
}

// IMPORTANT: this must be the SERVICE ROLE key, not the "anon" public key.
// The service role key bypasses Row Level Security, which is exactly why
// it must never be sent to the browser — it only ever lives here, on the
// backend, read from .env.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false }
  }
);

module.exports = { supabase };
