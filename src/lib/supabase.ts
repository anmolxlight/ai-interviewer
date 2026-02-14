import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      interviews: {
        Row: {
          id: string
          candidate_name: string
          candidate_email: string
          candidate_phone: string
          resume_text: string
          mode: 'chat' | 'voice'
          transcript: string
          score: number
          summary: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['interviews']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['interviews']['Insert']>
      }
    }
  }
}

