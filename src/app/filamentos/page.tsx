"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ActionButtons,
  Feedback,
  GlassCard,
  LoadingOrEmpty,
  NumberOrBlank,
  PageShell,
  useAuthGuard,
  useCrudList,
} from "../_shared";

type Fabricante = {
  id_fabricante_filamento: number;
  nome_fabricante: string;
  ativo?: boolean;
};

type Registro = {
  id_filamento?: number;
  nome_filamento?: string | null;
  material_filamento?: string | null;
  id_fabricante_filamento?: number | null;
  cor_filamento?: string | null;
  custo_medio_brl?: number | null;
  fabricante?: {
    id_fabricante_filamento: number;
    nome_fabricante: string;
  } | null;
};

const MATERIAIS_FILAMENTO = [
  "PLA",
  "PLA+",
  "PLA Silk",
  "PLA Matte",
  "PLA Wood",
  "PLA Carbon Fiber",
  "PETG",
  "PETG Carbon Fiber",
  "ABS",
  "ABS+",
  "ASA",
  "ASA Carbon Fiber",
  "PP",
  "PC",
  "PC-ABS",
  "PA",
  "PA6",
  "PA12",
  "Nylon",
  "Nylon Carbon Fiber",
  "TPU",
  "TPE",
  "PVA",
  "HIPS",
  "PMMA",
  "POM",
  "PEEK",
  "PEI",
  "PPS",
  "PPS-CF",
  "PVDF",
  "Metal Filled",
  "Outro",
];

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/filamentos");

  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nomeFilamento, setNomeFilamento] = useState("");
  const [materialFilamento, setMaterialFilamento] = useState("");
  const [idFabricanteFilamento, setIdFabricanteFilamento] = useState("");
  const [corFilamento, setCorFilamento] = useState("");
  const [custoMedioBrl, setCustoMedioBrl] = useState("");

  useEffect(() => {
    carregarFabricantes();
  }, []);

  async function carregarFabricantes() {
    try {
      const response = await fetch("/api/fabricantes-filamentos", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Erro ao carregar fabricantes.");
      }

      setFabricantes(result.data || []);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar fabricantes.");
    }
  }

  function resetForm() {
    setEditingId(null);
    setNomeFilamento("");
    setMaterialFilamento("");
    setIdFabricanteFilamento("");
    setCorFilamento("");
    setCustoMedioBrl("");
  }

  function fillForEdit(row: Registro) {
    setEditingId(String(row.id_filamento ?? ""));
    setNomeFilamento(String(row.nome_filamento ?? ""));
    setMaterialFilamento(String(row.material_filamento ?? ""));
    setIdFabricanteFilamento(String(row.id_fabricante_filamento ?? ""));
    setCorFilamento(String(row.cor_filamento ?? ""));
    setCustoMedioBrl(String(row.custo_medio_brl ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este filamento?")) return;

    try {
      setErro("");
      setMensagem("");

      const response = await fetch("/api/filamentos?id=" + id, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Erro ao excluir.");
      }

      setMensagem("Filamento excluído com sucesso.");

      if (editingId === id) resetForm();
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const payload: Record<string, string | number | null> = {
        nome_filamento: nomeFilamento || null,
        material_filamento: materialFilamento || null,
        id_fabricante_filamento: NumberOrBlank(idFabricanteFilamento),
        cor_filamento: corFilamento || null,
        custo_medio_brl: NumberOrBlank(custoMedioBrl),
      };

      const method = editingId ? "PUT" : "POST";
      if (editingId) payload.id_filamento = Number(editingId);

      const response = await fetch("/api/filamentos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Erro ao salvar.");
      }

      setMensagem(editingId ? "Filamento atualizado com sucesso." : "Filamento salvo com sucesso.");
      resetForm();
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (!ready) return <div className="p-6 text-slate-100">Carregando...</div>;

  return (
    <PageShell
      title="Filamentos"
      description="Cadastre filamentos usando listas padronizadas de material e fabricante."
    >
      <Feedback erro={erro} mensagem={mensagem} />

      <GlassCard>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">
              {editingId ? "Editar filamento" : "Novo filamento"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              O material e o fabricante agora são selecionados em listas cadastradas.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
            >
              Cancelar edição
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-bold text-slate-300">Nome do filamento</label>
            <input
              value={nomeFilamento}
              onChange={(e) => setNomeFilamento(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              placeholder="Ex.: PLA Preto 1kg"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Material</label>
            <select
              value={materialFilamento}
              onChange={(e) => setMaterialFilamento(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              required
            >
              <option value="">Selecione</option>
              {MATERIAIS_FILAMENTO.map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Fabricante</label>
            <select
              value={idFabricanteFilamento}
              onChange={(e) => setIdFabricanteFilamento(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
            >
              <option value="">Sem fabricante</option>
              {fabricantes
                .filter((fabricante) => fabricante.ativo !== false)
                .map((fabricante) => (
                  <option
                    key={fabricante.id_fabricante_filamento}
                    value={fabricante.id_fabricante_filamento}
                  >
                    {fabricante.nome_fabricante}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Cor</label>
            <input
              value={corFilamento}
              onChange={(e) => setCorFilamento(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              placeholder="Ex.: Preto"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Custo médio BRL</label>
            <input
              value={custoMedioBrl}
              onChange={(e) => setCustoMedioBrl(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              placeholder="Ex.: 89.90"
              inputMode="decimal"
            />
          </div>

          <div className="flex items-end lg:col-span-4">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : editingId ? "Atualizar filamento" : "Salvar filamento"}
            </button>
          </div>
        </form>
      </GlassCard>

      <GlassCard>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Lista de filamentos</h2>
            <p className="mt-1 text-sm text-slate-400">
              Visualização com nomes legíveis de material e fabricante.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              carregarFabricantes();
              reload();
            }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
          >
            Atualizar
          </button>
        </div>

        <LoadingOrEmpty
          loading={loading}
          empty={data.length === 0}
          loadingText="Carregando filamentos..."
          emptyText="Nenhum filamento cadastrado."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-slate-400">
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Material</th>
                  <th className="px-4 py-2">Fabricante</th>
                  <th className="px-4 py-2">Cor</th>
                  <th className="px-4 py-2">Custo médio</th>
                  <th className="px-4 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id_filamento} className="rounded-2xl bg-white/[0.035] text-slate-200">
                    <td className="rounded-l-2xl px-4 py-3 font-bold text-white">
                      {row.nome_filamento || "-"}
                    </td>
                    <td className="px-4 py-3">{row.material_filamento || "-"}</td>
                    <td className="px-4 py-3">{row.fabricante?.nome_fabricante || "-"}</td>
                    <td className="px-4 py-3">{row.cor_filamento || "-"}</td>
                    <td className="px-4 py-3">
                      {row.custo_medio_brl == null
                        ? "-"
                        : Number(row.custo_medio_brl).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                    </td>
                    <td className="rounded-r-2xl px-4 py-3">
                      <ActionButtons
                        onEdit={() => fillForEdit(row)}
                        onDelete={() => handleDelete(String(row.id_filamento ?? ""))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LoadingOrEmpty>
      </GlassCard>
    </PageShell>
  );
}
