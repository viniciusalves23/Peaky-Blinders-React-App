
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zsedlaigklqyrqviitdl.supabase.co';
// Usando a Public Anon Key fornecida
const supabaseKey = 'sb_publishable_uZrHMl5QDdK_InWO-mhHog_wPUHhNyW';

export const supabase = createClient(supabaseUrl, supabaseKey);
