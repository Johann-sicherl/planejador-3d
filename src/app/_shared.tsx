"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type ApiResult<T> = {
  ok: boolean;
  data?: T[];
  error?: string;
};

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
    <main className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black">{title}</h1>
            <p className="mt-2 text-sm text-zinc-800">{description}</p>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50">Dashboard</a>
            <a href="/" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50">Início</a>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

export function Feedback({ erro, mensagem }: { erro: string; mensagem: string }) {
  return (
    <>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      {mensagem && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{mensagem}</div>}
    </>
  );
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

export function ActionButtons({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button onClick={onEdit} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">Editar</button>
      <button onClick={onDelete} className="rounded-lg border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">Excluir</button>
    </div>
  );
}

export function LoadingOrEmpty({
  loading,
  empty,
  emptyText,
  loadingText,
  children,
}: {
  loading: boolean;
  empty: boolean;
  emptyText: string;
  loadingText: string;
  children: React.ReactNode;
}) {
  if (loading) return <div className="py-10 text-center text-sm text-zinc-800">{loadingText}</div>;
  if (empty) return <div className="py-10 text-center text-sm text-zinc-800">{emptyText}</div>;
  return <>{children}</>;
}

export function useAuthGuard() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
      if (!data.user && typeof window !== "undefined" && !["/login","/cadastro"].includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setReady(true);
      if (!session?.user && typeof window !== "undefined" && !["/login","/cadastro"].includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { ready, email };
}
