"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionButtons, Feedback, getJson, LoadingOrEmpty, NumberOrBlank, PageShell, useAuthGuard, useCrudList } from "../_shared";

type Registro = Record<string, string | number | null>;

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/plano-producao");
  const [options, setOptions] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [id_pedido, setId_pedido] = useState("");
  const [id_impressora, setId_impressora] = useState("");
  const [id_3mf, setId_3mf] = useState("");
  const [tempo_impressao_min, setTempo_impressao_min] = useState("");

  useEffect(() => {
getJson<any>("/api/options").then((r) => setOptions(r[0] || null)).catch(() => {});
  }, []);

  function resetForm() {
    setEditingId(null);
    setId_pedido("");
    setId_impressora("");
    setId_3mf("");
    setTempo_impressao_min("");
  }

  function fillForEdit(row: Registro) {
    setEditingId(String(row["id_pedido"] ?? ""));
    setId_pedido(String(row["id_pedido"] ?? ""));
    setId_impressora(String(row["id_impressora"] ?? ""));
    setId_3mf(String(row["id_3mf"] ?? ""));
    setTempo_impressao_min(String(row["tempo_impressao_min"] ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este registro?")) return;
    try {
      setErro("");
      setMensagem("");
      const response = await fetch("/api/plano-producao?id=" + id, { method: "DELETE" });
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
        id_pedido: id_pedido === "" ? null : Number(id_pedido),
        id_impressora: id_impressora === "" ? null : Number(id_impressora),
        id_3mf: id_3mf === "" ? null : Number(id_3mf),
        tempo_impressao_min: NumberOrBlank(tempo_impressao_min),
      };

      const method = editingId ? "PUT" : "POST";
      if (editingId) payload["id_pedido"] = Number(editingId);

      const response = await fetch("/api/plano-producao", {
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
    <PageShell title="Plano de Produção" description="Planejamento de produção por pedido.">
      <div className="grid gap-6 xl:grid-cols-[520px_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-black">{editingId ? "Editar registro" : "Novo registro"}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Pedido</label>
              <select value={id_pedido} onChange={(e) => setId_pedido(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500">
                <option value="">Selecione</option>
                {(options?.pedidos || []).map((item: any) => (
                  <option key={String(item[Object.keys(item)[0]])} value={String(item[Object.keys(item)[0]])}>
                    {String(item[Object.keys(item)[0]])} - {String(item[Object.keys(item)[1]] ?? item[Object.keys(item)[0]])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Impressora</label>
              <select value={id_impressora} onChange={(e) => setId_impressora(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500">
                <option value="">Selecione</option>
                {(options?.impressoras || []).map((item: any) => (
                  <option key={String(item[Object.keys(item)[0]])} value={String(item[Object.keys(item)[0]])}>
                    {String(item[Object.keys(item)[0]])} - {String(item[Object.keys(item)[1]] ?? item[Object.keys(item)[0]])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Arquivo 3MF</label>
              <select value={id_3mf} onChange={(e) => setId_3mf(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500">
                <option value="">Selecione</option>
                {(options?.arquivos3mf || []).map((item: any) => (
                  <option key={String(item[Object.keys(item)[0]])} value={String(item[Object.keys(item)[0]])}>
                    {String(item[Object.keys(item)[0]])} - {String(item[Object.keys(item)[1]] ?? item[Object.keys(item)[0]])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Tempo de impressão em minutos</label>
              <input type="number" value={tempo_impressao_min} onChange={(e) => setTempo_impressao_min(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Tempo de impressão em minutos" />
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
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Pedido</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Impressora</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Arquivo 3MF</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Tempo de impressão em minutos</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={String(index)}>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["id_pedido"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["id_impressora"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["id_3mf"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["tempo_impressao_min"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">
                        <ActionButtons onEdit={() => fillForEdit(row)} onDelete={() => handleDelete(String(row["id_pedido"] ?? ""))} />
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
