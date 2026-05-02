import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Chave pública (browser) — pode ser anon key ou publishable key
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Chave secreta (servidor) — service role key ou secret key
// NUNCA use prefixo NEXT_PUBLIC_ nesta variável
const supabaseSecretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  supabasePublicKey; // fallback temporário se não configurada ainda

if (!supabaseUrl || !supabasePublicKey) {
  throw new Error("Supabase environment variables are missing");
}

// Cliente para o BROWSER (usa chave pública + sessão do usuário)
export const supabase = createClient(supabaseUrl, supabasePublicKey);

// Cliente para as API ROUTES do servidor (usa chave secreta — bypassa RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
