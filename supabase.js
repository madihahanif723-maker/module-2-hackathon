import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
const supabaseUrl = "https://dubfqgrysuxlobpiveod.supabase.co";
const supabaseAnonKey = "sb_publishable_-C2lDiz7SZkWKzAJur-OoQ_8dZMLG5E";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdminKey="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1YmZxZ3J5c3V4bG9icGl2ZW9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY1ODMyNSwiZXhwIjoyMDk5MjM0MzI1fQ.lLYDiXAMQvuC68QJkgMET9I6NffAn06a9dyvUECGbxE"
export const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);
export default supabase;