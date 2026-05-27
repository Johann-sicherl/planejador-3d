import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * Fix #1 — Autenticação nas rotas de API.
 * Todas as rotas /api/* exigem sessão Supabase válida.
 * Requisições sem sessão recebem 401 JSON em vez de dados.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Só protege rotas de API
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Não autenticado. Faça login para continuar." },
      { status: 401 },
    );
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
