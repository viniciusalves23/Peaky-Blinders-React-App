
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zsedlaigklqyrqviitdl.supabase.co';

// VOLTANDO PARA A CHAVE JWT ANON (eyJ...)
// O Gateway da Edge Function exige um Bearer Token JWT válido. 
// A chave 'sb_publishable' não é um JWT, causando erro 401.
// Esta chave foi copiada dos seus logs recentes (anon public).
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZWRsYWlna2xxeXJxdmlpdGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzEwMTksImV4cCI6MjA4MjAwNzAxOX0.27GtpfI2rAQQ8Q-96f69wJ8Lqzw69oKNUkr_6WqlXns';

export const supabase = createClient(supabaseUrl, supabaseKey);
