"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionButtons, Feedback, getJson, LoadingOrEmpty, NumberOrBlank, PageShell, useAuthGuard, useCrudList } from "../_shared";

type Registro = Record<string, string | number | null>;

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/cotacoes");
  const [options, setOptions] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [id_componente_stl, setId_componente_stl] = useState("");
  const [id_impressora, setId_impressora] = useState("");
  const [custo_geral, setCusto_geral] = useState("");
  const [valor_venda, setValor_venda] = useState("");
  const [lucro_geral, setLucro_geral] = useState("");
  const [dia_cot, setDia_cot] = useState("");
  const [mes_cot, setMes_cot] = useState("");
  const [ano_cot, setAno_cot] = useState("");

  useEffect(() => {
getJson<any>("/api/options").then((r) => setOptions(r[0] || null)).catch(() => {});
  }, []);

  function resetForm() {
    setEditingId(null);
    setId_componente_stl("");
    setId_impressora("");
    setCusto_geral("");
    setValor_venda("");
    setLucro_geral("");
    setDia_cot("");
    setMes_cot("");
    setAno_cot("");
  }

  function fillForEdit(row: Registro) {
    setEditingId(String(row["id_componente_stl"] ?? ""));
    setId_componente_stl(String(row["id_componente_stl"] ?? ""));
    setId_impressora(String(row["id_impressora"] ?? ""));
    setCusto_geral(String(row["custo_geral"] ?? ""));
    setValor_venda(String(row["valor_venda"] ?? ""));
    setLucro_geral(String(row["lucro_geral"] ?? ""));
    setDia_cot(String(row["dia_cot"] ?? ""));
    setMes_cot(String(row["mes_cot"] ?? ""));
    setAno_cot(String(row["ano_cot"] ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este registro?")) return;
    try {
      setErro("");
      setMensagem("");
      const response = await fetch("/api/cotacoes?id=" + id, { method: "DELETE" });
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
        id_componente_stl: id_componente_stl === "" ? null : Number(id_componente_stl),
        id_impressora: id_impressora === "" ? null : Number(id_impressora),
        custo_geral: NumberOrBlank(custo_geral),
        valor_venda: NumberOrBlank(valor_venda),
        lucro_geral: NumberOrBlank(lucro_geral),
        dia_cot: NumberOrBlank(dia_cot),
        mes_cot: NumberOrBlank(mes_cot),
        ano_cot: NumberOrBlank(ano_cot),
      };

      const method = editingId ? "PUT" : "POST";
      if (editingId) payload["id_componente_stl"] = Number(editingId);

      const response = await fetch("/api/cotacoes", {
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
    <PageShell title="Cotações" description="Cadastro de cotações por componente e impressora.">
      <div className="grid gap-6 xl:grid-cols-[520px_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-black">{editingId ? "Editar registro" : "Novo registro"}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Componente STL</label>
              <select value={id_componente_stl} onChange={(e) => setId_componente_stl(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500">
                <option value="">Selecione</option>
                {(options?.componentes || []).map((item: any) => (
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
              <label className="mb-1 block text-sm font-medium text-black">Custo geral</label>
              <input type="number" value={custo_geral} onChange={(e) => setCusto_geral(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Custo geral" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Valor de venda</label>
              <input type="number" value={valor_venda} onChange={(e) => setValor_venda(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Valor de venda" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Lucro geral</label>
              <input type="number" value={lucro_geral} onChange={(e) => setLucro_geral(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Lucro geral" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Dia</label>
              <input type="number" value={dia_cot} onChange={(e) => setDia_cot(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Dia" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Mês</label>
              <input type="number" value={mes_cot} onChange={(e) => setMes_cot(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Mês" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Ano</label>
              <input type="number" value={ano_cot} onChange={(e) => setAno_cot(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Ano" />
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
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Componente STL</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Impressora</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Custo geral</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Valor de venda</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Lucro geral</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Dia</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Mês</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Ano</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={String(index)}>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["id_componente_stl"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["id_impressora"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["custo_geral"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["valor_venda"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["lucro_geral"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["dia_cot"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["mes_cot"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["ano_cot"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">
                        <ActionButtons onEdit={() => fillForEdit(row)} onDelete={() => handleDelete(String(row["id_componente_stl"] ?? ""))} />
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
