"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionButtons, Feedback, getJson, LoadingOrEmpty, NumberOrBlank, PageShell, useAuthGuard, useCrudList } from "../_shared";

type Registro = Record<string, string | number | null>;

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/arquivos-3mf");
  const [options, setOptions] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome_arquivo_3mf, setNome_arquivo_3mf] = useState("");
  const [id_componente_stl, setId_componente_stl] = useState("");
  const [qtd_componente, setQtd_componente] = useState("");

  useEffect(() => {
getJson<any>("/api/options").then((r) => setOptions(r[0] || null)).catch(() => {});
  }, []);

  function resetForm() {
    setEditingId(null);
    setNome_arquivo_3mf("");
    setId_componente_stl("");
    setQtd_componente("");
  }

  function fillForEdit(row: Registro) {
    setEditingId(String(row["id_3mf"] ?? ""));
    setNome_arquivo_3mf(String(row["nome_arquivo_3mf"] ?? ""));
    setId_componente_stl(String(row["id_componente_stl"] ?? ""));
    setQtd_componente(String(row["qtd_componente"] ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este registro?")) return;
    try {
      setErro("");
      setMensagem("");
      const response = await fetch("/api/arquivos-3mf?id=" + id, { method: "DELETE" });
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
        nome_arquivo_3mf: nome_arquivo_3mf || null,
        id_componente_stl: id_componente_stl === "" ? null : Number(id_componente_stl),
        qtd_componente: NumberOrBlank(qtd_componente),
      };

      const method = editingId ? "PUT" : "POST";
      if (editingId) payload["id_3mf"] = Number(editingId);

      const response = await fetch("/api/arquivos-3mf", {
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
    <PageShell title="Arquivos 3MF" description="Cadastro de arquivos 3MF.">
      <div className="grid gap-6 xl:grid-cols-[520px_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-black">{editingId ? "Editar registro" : "Novo registro"}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Nome do arquivo 3MF</label>
              <input type="text" value={nome_arquivo_3mf} onChange={(e) => setNome_arquivo_3mf(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Nome do arquivo 3MF" />
            </div>
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
              <label className="mb-1 block text-sm font-medium text-black">Quantidade do componente</label>
              <input type="number" value={qtd_componente} onChange={(e) => setQtd_componente(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Quantidade do componente" />
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
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Nome do arquivo 3MF</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Componente STL</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Quantidade do componente</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={String(index)}>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["nome_arquivo_3mf"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["id_componente_stl"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["qtd_componente"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">
                        <ActionButtons onEdit={() => fillForEdit(row)} onDelete={() => handleDelete(String(row["id_3mf"] ?? ""))} />
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
