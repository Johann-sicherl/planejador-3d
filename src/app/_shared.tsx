"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Database,
  Factory,
  FileText,
  Gauge,
  Home,
  Layers3,
  Package,
  Printer,
  Settings,
  TriangleAlert,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export type ApiResult<T> = {
  ok: boolean;
  data?: T[];
  error?: string;
};

const menu = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/plano-producao", label: "Plano de Produ\u00e7\u00e3o", icon: Factory },
  { href: "/execucoes", label: "Execu\u00e7\u00e3o", icon: Printer },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/componentes", label: "Componentes", icon: Package },
  { href: "/filamentos", label: "Filamentos", icon: Layers3 },
  { href: "/arquivos-3mf", label: "Arquivos 3MF", icon: FileText },
  { href: "/cotacoes", label: "Cota\u00e7\u00f5es", icon: BarChart3 },
  { href: "/falhas", label: "Falhas", icon: TriangleAlert },
];

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/80 p-5 backdrop-blur-xl lg:block">
          <Link href="/dashboard" className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 shadow-lg shadow-cyan-500/20">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-black text-white">Controle Principal J_ao_Cubo_3d</p>
              <p className="text-xs text-slate-400">{"Produ\u00e7\u00e3o inteligente"}</p>
            </div>
          </Link>

          <nav className="space-y-2">
            {menu.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-cyan-400/10 hover:text-white"
                >
                  <Icon className="h-4 w-4 text-slate-400 group-hover:text-cyan-300" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sistema</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Template</span>
                <span className="text-slate-200">Dark Pro</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/75 px-5 py-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 lg:hidden">
                <Home className="h-4 w-4" />
                Menu
              </Link>

              <div className="hidden max-w-md flex-1 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-400 md:flex">
                {"Buscar pedido, cliente, pe\u00e7a ou impressora..."}
              </div>

              <Link href="/configuracoes" className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 hover:bg-white/10">
                <Settings className="h-5 w-5" />
              </Link>
            </div>
          </header>

          <div className="mx-auto max-w-[1800px] space-y-6 px-5 py-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-400">Controle Principal</p>
                <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">{description}</p>
              </div>
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20 backdrop-blur-xl ${className}`}>{children}</div>;
}

export function Feedback({ erro, mensagem }: { erro: string; mensagem: string }) {
  return (
    <>
      {erro && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">{erro}</div>}
      {mensagem && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">{mensagem}</div>}
    </>
  );
}

export function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onEdit} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20">Editar</button>
      <button onClick={onDelete} className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-400/20">Excluir</button>
    </div>
  );
}

export function LoadingOrEmpty({ loading, empty, emptyText, loadingText, children }: { loading: boolean; empty: boolean; emptyText: string; loadingText: string; children: React.ReactNode }) {
  if (loading) return <div className="rounded-3xl border border-white/10 bg-white/[0.04] py-12 text-center text-sm text-slate-400">{loadingText}</div>;
  if (empty) return <div className="rounded-3xl border border-white/10 bg-white/[0.04] py-12 text-center text-sm text-slate-400">{emptyText}</div>;
  return <>{children}</>;
}

export function useCrudList<T>(url: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function reload() {
    try {
      setLoading(true);
      setErro("");
      const response = await fetch(url, { cache: "no-store" });
      const result: ApiResult<T> = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Erro ao carregar dados.");
      setData(result.data || []);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, [url]);

  return { data, loading, erro, setErro, reload };
}

export async function getJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const result: ApiResult<T> = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "Erro ao carregar.");
  return result.data || [];
}

export function NumberOrBlank(value: string) {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function useAuthGuard() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
      if (!data.user && typeof window !== "undefined" && !["/login", "/cadastro"].includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setReady(true);
      if (!session?.user && typeof window !== "undefined" && !["/login", "/cadastro"].includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { ready, email };
}
