"use client";

import { FormEvent, useState } from "react";
import {
  ActionButtons,
  Feedback,
  GlassCard,
  LoadingOrEmpty,
  PageShell,
  useAuthGuard,
  useCrudList,
} from "../_shared";

type Fabricante = {
  id_fabricante_filamento?: number;
  nome_fabricante?: string | null;
  site_fabricante?: string | null;
  observacoes?: string | null;
  ativo?: boolean | null;
};

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Fabricante>(
    "/api/fabricantes-filamentos"
  );

  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nomeFabricante, setNomeFabricante] = useState("");
  const [siteFabricante, setSiteFabricante] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);

  function resetForm() {
    setEditingId(null);
    setNomeFabricante("");
    setSiteFabricante("");
    setObservacoes("");
    setAtivo(true);
  }

  function fillForEdit(row: Fabricante) {
    setEditingId(String(row.id_fabricante_filamento ?? ""));
    setNomeFabricante(String(row.nome_fabricante ?? ""));
    setSiteFabricante(String(row.site_fabricante ?? ""));
    setObservacoes(String(row.observacoes ?? ""));
    setAtivo(row.ativo !== false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const payload: Record<string, string | boolean | number | null> = {
        nome_fabricante: nomeFabricante || null,
        site_fabricante: siteFabricante || null,
        observacoes: observacoes || null,
        ativo,
      };

      const method = editingId ? "PUT" : "POST";
      if (editingId) payload.id_fabricante_filamento = Number(editingId);

      const response = await fetch("/api/fabricantes-filamentos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Erro ao salvar.");
      }

      setMensagem(editingId ? "Fabricante atualizado com sucesso." : "Fabricante salvo com sucesso.");
      resetForm();
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este fabricante?")) return;

    try {
      setErro("");
      setMensagem("");

      const response = await fetch("/api/fabricantes-filamentos?id=" + id, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Erro ao excluir.");
      }

      setMensagem("Fabricante excluído com sucesso.");

      if (editingId === id) resetForm();
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  if (!ready) return <div className="p-6 text-slate-100">Carregando...</div>;

  return (
    <PageShell
      title="Fabricantes de Filamentos"
      description="Cadastre e mantenha os fabricantes usados no cadastro de filamentos."
    >
      <Feedback erro={erro} mensagem={mensagem} />

      <GlassCard>
        <h2 className="mb-5 text-xl font-black text-white">
          {editingId ? "Editar fabricante" : "Novo fabricante"}
        </h2>

        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Nome do fabricante</label>
            <input
              value={nomeFabricante}
              onChange={(e) => setNomeFabricante(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              placeholder="Ex.: 3D Fila"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Site</label>
            <input
              value={siteFabricante}
              onChange={(e) => setSiteFabricante(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Status</label>
            <select
              value={ativo ? "true" : "false"}
              onChange={(e) => setAtivo(e.target.value === "true")}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="lg:col-span-4">
            <label className="mb-2 block text-sm font-bold text-slate-300">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              placeholder="Observações gerais sobre o fabricante"
            />
          </div>
        </form>
      </GlassCard>

      <GlassCard>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-white">Lista de fabricantes</h2>
          <button
            type="button"
            onClick={reload}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
          >
            Atualizar
          </button>
        </div>

        <LoadingOrEmpty
          loading={loading}
          empty={data.length === 0}
          loadingText="Carregando fabricantes..."
          emptyText="Nenhum fabricante cadastrado."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-slate-400">
                  <th className="px-4 py-2">Fabricante</th>
                  <th className="px-4 py-2">Site</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Observações</th>
                  <th className="px-4 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id_fabricante_filamento} className="bg-white/[0.035] text-slate-200">
                    <td className="rounded-l-2xl px-4 py-3 font-bold text-white">
                      {row.nome_fabricante || "-"}
                    </td>
                    <td className="px-4 py-3">{row.site_fabricante || "-"}</td>
                    <td className="px-4 py-3">{row.ativo === false ? "Inativo" : "Ativo"}</td>
                    <td className="px-4 py-3">{row.observacoes || "-"}</td>
                    <td className="rounded-r-2xl px-4 py-3">
                      <ActionButtons
                        onEdit={() => fillForEdit(row)}
                        onDelete={() => handleDelete(String(row.id_fabricante_filamento ?? ""))}
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
