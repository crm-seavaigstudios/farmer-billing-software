import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xmlskjodwfmhowgxlypj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtbHNram9kd2ZtaG93Z3hseXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNTExMjMsImV4cCI6MjEwNDgyNzEyM30.xVME1THi1aSkBruI4ikp00HHyp-hGQPub-RBLlxGzfU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
