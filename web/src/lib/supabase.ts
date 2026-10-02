import { createClient } from '@supabase/supabase-js';

// ACTIVE OFFICIAL DATABASE: xmlskjodwfmhowgxlypj
const NEW_SUPABASE_URL = 'https://xmlskjodwfmhowgxlypj.supabase.co';
const NEW_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtbHNram9kd2ZtaG93Z3hseXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNTExMjMsImV4cCI6MjEwNDgyNzEyM30.xVME1THi1aSkBruI4ikp00HHyp-hGQPub-RBLlxGzfU';

// Guard: Force override any stale legacy Vercel environment variables pointing to old phdkynxbdhmrdwhznuec
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isOldUrl = envUrl && envUrl.includes('phdkynxbdhmrdwhznuec');
const supabaseUrl = (!envUrl || isOldUrl) ? NEW_SUPABASE_URL : envUrl;
const supabaseAnonKey = (!envKey || isOldUrl) ? NEW_SUPABASE_ANON_KEY : envKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
