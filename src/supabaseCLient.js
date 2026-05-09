import { createClient } from '@supabase/supabase-js'


const supabaseUrl = 'https://ekqixbskebdsjftlprwm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcWl4YnNrZWJkc2pmdGxwcndtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDkxMzgsImV4cCI6MjA4ODQ4NTEzOH0.OJqUa0D0bOJ_4pHB8pSkMmg7qtzREUKZry22PuLDlBo'


export const supabase = createClient(supabaseUrl, supabaseAnonKey)