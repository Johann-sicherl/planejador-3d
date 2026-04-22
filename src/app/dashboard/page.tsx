"use client";

import { useEffect, useState } from "react";
import { PageShell, useAuthGuard } from "../_shared";

type DashboardData = {
  total_clientes: number;
  total_filamentos: number;
  total_componentes: number;
  total_impressoras: number;
  total_pedidos: number;
  total_execucoes: number;
  execucoes_em_producao: number;
  execucoes_finalizadas: number;
  execucoes_pendentes: number;
  total_falhas: number;
  total_cotacoes: number;
  estoque_total_gramas: number;
};

export default function DashboardPage() {
  const { ready, email } = useAuthGuard();
  const [data, setData] = useState<DashboardData | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((result) => {
        if (!result.ok) throw new Error(result.error || "Erro ao carregar dashboard.");
        setData(result.data?.[0] || null);
      })
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar dashboard."));
  }, []);

  if (!ready) return <main className="min-h-screen p-8">Carregando...</main>;

  const cards = data ? [
    ["Clientes", data.total_clientes],
    ["Filamentos", data.total_filamentos],
    ["Componentes", data.total_componentes],
    ["Impressoras", data.total_impressoras],
    ["Pedidos", data.total_pedidos],
    ["Execuções", data.total_execucoes],
    ["Em produção", data.execucoes_em_producao],
    ["Finalizadas", data.execucoes_finalizadas],
    ["Pendentes", data.execucoes_pendentes],
    ["Falhas", data.total_falhas],
    ["Cotações", data.total_cotacoes],
    ["Estoque total (g)", data.estoque_total_gramas],
  ] : [];

  return (
    <PageShell title="Dashboard" description={`Métricas reais do sistema. Usuário logado: ${email || ""}`}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-800">{label}</div>
            <div className="mt-2 text-3xl font-bold text-black">{String(value)}</div>
          </div>
        ))}
      </div>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
    </PageShell>
  );
}
