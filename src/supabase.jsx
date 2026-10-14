import { createClient } from '@supabase/supabase-js'
import { configuracaoDevValida } from './auth/authSession'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = configuracaoDevValida(supabaseUrl, supabaseAnonKey)

export const supabase = supabaseConfigurado
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
