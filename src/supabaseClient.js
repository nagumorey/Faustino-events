import { createClient } from '@supabase/supabase-js'

// Gamitin natin ang import.meta.env para basahin ang settings sa Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)