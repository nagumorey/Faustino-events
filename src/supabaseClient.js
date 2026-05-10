import { createClient } from '@supabase/supabase-js'

// I-hardcode muna natin para ma-test kung gagana ang connection
const supabaseUrl = 'https://ekqixbskebdsjftlpdwm.supabase.co'
const supabaseAnonKey = 'sb_publishable_yAMill8Cs_Stj7NF...' // I-paste mo rito 'yung buong Publishable key mo

export const supabase = createClient(supabaseUrl, supabaseAnonKey)