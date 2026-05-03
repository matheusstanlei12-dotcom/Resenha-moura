import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.gastos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
        descricao TEXT NOT NULL, 
        valor NUMERIC(10,2) NOT NULL, 
        data_gasto TIMESTAMPTZ DEFAULT NOW(), 
        categoria TEXT NOT NULL, 
        created_at TIMESTAMPTZ DEFAULT NOW()
    ); 
    ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY; 
    
    DROP POLICY IF EXISTS "Acesso Total Gastos" ON public.gastos;
    CREATE POLICY "Acesso Total Gastos" ON public.gastos FOR ALL USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'dono')));
  `;
  
  // Try to use a previously created RPC for executing arbitrary SQL if it exists, otherwise tell user
  console.log("We need to run SQL for the new table. I will tell the user to run it in the Supabase Dashboard.");
}

run();
