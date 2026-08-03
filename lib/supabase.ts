import { createClient } from '@supabase/supabase-js';

// Las llaves ahora se leen de forma segura desde la caja fuerte (.env.local)
// El símbolo "!" al final le asegura a TypeScript que la variable sí existe.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);