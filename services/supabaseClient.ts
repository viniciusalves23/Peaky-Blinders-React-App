import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = "https://spoqshgxwtldenetoxcs.supabase.co"
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwb3FzaGd4d3RsZGVuZXRveGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0OTAyNzQsImV4cCI6MjA1MTA2NjI3NH0.pv3hfmH_hACCCdRYqTXHXS7j8VqiSm6L1Zl4_xaGIz4"

// Create a singleton Supabase client instance
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
