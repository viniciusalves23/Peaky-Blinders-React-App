import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = "https://spoqshgxwtldenetoxcs.supabase.co"

// Atualize esta chave com a 'anon public' que você forneceu
const supabaseKey =
  "sb_publishable_ObTWoleg1AWfAVm0peeB-Q_nGXOpYOm"

// Create a singleton Supabase client instance
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)