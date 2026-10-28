import { createClient } from '@supabase/supabase-js'

// These come from .env.local (see .env.example and docs/01-project-setup.md).
// The publishable/anon key is safe in the browser ONLY because every table
// has row-level security. Never put the service-role key here.
const url = import.meta.env.VITE_SUPABASE_URL
// Supabase's "Connect" snippet has used different names over time; accept any of them.
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

export const supabase = isConfigured ? createClient(url, key) : null
