"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionButtons, Feedback, getJson, LoadingOrEmpty, NumberOrBlank, PageShell, useAuthGuard, useCrudList } from "../_shared";

type Registro = Record<string, string | number | null>;

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/filamentos");
  const [options, setOptions] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome_filamento, setNome_filamento] = useState("");
  const [material_filamento, setMaterial_filamento] = useState("");
  const [cor_filamento, setCor_filamento] = useState("");
  const [custo_medio_brl, setCusto_medio_brl] = useState("");

  useEffect(() => {

  }, []);

  function resetForm() {
    setEditingId(null);
    setNome_filamento("");
    setMaterial_filamento("");
    setCor_filamento("");
    setCusto_medio_brl("");
  }

  function fillForEdit(row: Registro) {
    setEditingId(String(row["id_filamento"] ?? ""));
    setNome_filamento(String(row["nome_filamento"] ?? ""));
    setMaterial_filamento(String(row["material_filamento"] ?? ""));
    setCor_filamento(String(row["cor_filamento"] ?? ""));
    setCusto_medio_brl(String(row["custo_medio_brl"] ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este registro?")) return;
    try {
      setErro("");
      setMensagem("");
      const response = await fetch("/api/filamentos?id=" + id, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Erro ao excluir.");
      setMensagem("Registro excluído com sucesso.");
      if (editingId === id) resetForm();
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const payload: Record<string, unknown> = {
        nome_filamento: nome_filamento || null,
        material_filamento: material_filamento || null,
        cor_filamento: cor_filamento || null,
        custo_medio_brl: NumberOrBlank(custo_medio_brl),
      };

      const method = editingId ? "PUT" : "POST";
      if (editingId) payload["id_filamento"] = Number(editingId);

      const response = await fetch("/api/filamentos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Erro ao salvar.");
      setMensagem(editingId ? "Registro atualizado com sucesso." : "Registro salvo com sucesso.");
      resetForm();
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (!ready) return <main className="min-h-screen p-8">Carregando...</main>;

  return (
    <PageShell title="Filamentos" description="Cadastro e consulta de filamentos.">
      <div className="grid gap-6 xl:grid-cols-[520px_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-black">{editingId ? "Editar registro" : "Novo registro"}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Nome do filamento</label>
              <input type="text" value={nome_filamento} onChange={(e) => setNome_filamento(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Nome do filamento" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Material</label>
              <input type="text" value={material_filamento} onChange={(e) => setMaterial_filamento(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Material" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Cor</label>
              <input type="text" value={cor_filamento} onChange={(e) => setCor_filamento(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Cor" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Custo médio BRL</label>
              <input type="number" value={custo_medio_brl} onChange={(e) => setCusto_medio_brl(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Custo médio BRL" />
            </div>
            <Feedback erro={erro} mensagem={mensagem} />
            <div className="flex gap-2">
              <button type="submit" disabled={salvando} className="flex-1 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60">
                {salvando ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-50">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-black">Lista</h2>
            <button onClick={reload} className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium text-black hover:bg-zinc-50">
              Atualizar
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <LoadingOrEmpty loading={loading} empty={data.length === 0} loadingText="Carregando registros..." emptyText="Nenhum registro cadastrado.">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Nome do filamento</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Material</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Cor</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Custo médio BRL</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={String(index)}>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["nome_filamento"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["material_filamento"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["cor_filamento"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["custo_medio_brl"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">
                        <ActionButtons onEdit={() => fillForEdit(row)} onDelete={() => handleDelete(String(row["id_filamento"] ?? ""))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </LoadingOrEmpty>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
