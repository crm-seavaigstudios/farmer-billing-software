import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phdkynxbdhmrdwhznuec.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZGt5bnhiZGhtcmR3aHpudWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjY5NzAsImV4cCI6MjEwMTU0Mjk3MH0.zfJ95WjnFPkeOY50O0xhRDwUcoXAaD1C4eDa13A6QAQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
