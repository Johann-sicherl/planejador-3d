import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy — Autenticação nas rotas de API (Next.js 16+).
 * Todas as rotas /api/* exigem sessão Supabase válida.
 * Requisições sem sessão recebem 401 JSON em vez de dados.
 * (Antes chamado de middleware.ts; renomeado conforme convenção do Next.js 16.)
 */
export async function proxy(request: NextRequest) {
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
