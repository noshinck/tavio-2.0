import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL  = 'https://nklsajfbjlgtkzcqydyy.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rbHNhamZiamxndGt6Y3F5ZHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzAzNzQsImV4cCI6MjA5MDQ0NjM3NH0.5ENw_aHhzQ3iV_QOkkLR1C-6DHwp7Alc5F9V3Ah2Ipc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
