import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabaseSecretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  supabasePublicKey;

if (!supabaseUrl || !supabasePublicKey) {
  throw new Error("Supabase environment variables are missing");
}

/**
 * Fix #1 — Cliente de browser usando @supabase/ssr.
 * Armazena tokens em cookies (não localStorage), permitindo que o
 * middleware leia a sessão no servidor para proteger as rotas de API.
 */
export const supabase = createBrowserClient(supabaseUrl, supabasePublicKey);

/** Cliente server-side com service-role key (somente em rotas de API). */
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
