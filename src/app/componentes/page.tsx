"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionButtons, Feedback, getJson, NumberOrBlank, LoadingOrEmpty, PageShell, useAuthGuard, useCrudList } from "../_shared";

type Registro = Record<string, string | number | null>;

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/componentes");
  const [options, setOptions] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nome_componente, setNomeComponente] = useState("");
  const [id_filamento1, setIdFilamento1] = useState(""); const [id_filamento2, setIdFilamento2] = useState("");
  const [id_filamento3, setIdFilamento3] = useState(""); const [id_filamento4, setIdFilamento4] = useState("");
  const [id_filamento5, setIdFilamento5] = useState(""); const [id_filamento6, setIdFilamento6] = useState("");
  const [id_filamento7, setIdFilamento7] = useState(""); const [id_filamento8, setIdFilamento8] = useState("");
  const [gramas_filamento_1, setGramas1] = useState(""); const [gramas_filamento_2, setGramas2] = useState("");
  const [gramas_filamento_3, setGramas3] = useState(""); const [gramas_filamento_4, setGramas4] = useState("");
  const [gramas_filamento_5, setGramas5] = useState(""); const [gramas_filamento_6, setGramas6] = useState("");
  const [gramas_filamento_7, setGramas7] = useState(""); const [gramas_filamento_8, setGramas8] = useState("");

  useEffect(() => {
    getJson<any>("/api/options").then((r) => setOptions(r[0] || null)).catch(() => {});
  }, []);

  function resetForm() {
    setEditingId(null);
    setNomeComponente("");
    setIdFilamento1(""); setIdFilamento2(""); setIdFilamento3(""); setIdFilamento4("");
    setIdFilamento5(""); setIdFilamento6(""); setIdFilamento7(""); setIdFilamento8("");
    setGramas1(""); setGramas2(""); setGramas3(""); setGramas4("");
    setGramas5(""); setGramas6(""); setGramas7(""); setGramas8("");
  }

  function fillForEdit(row: Registro) {
    setEditingId(String(row.id_componente_stl ?? ""));
    setNomeComponente(String(row.nome_componente ?? ""));
    setIdFilamento1(String(row.id_filamento1 ?? "")); setIdFilamento2(String(row.id_filamento2 ?? "")); setIdFilamento3(String(row.id_filamento3 ?? "")); setIdFilamento4(String(row.id_filamento4 ?? ""));
    setIdFilamento5(String(row.id_filamento5 ?? "")); setIdFilamento6(String(row.id_filamento6 ?? "")); setIdFilamento7(String(row.id_filamento7 ?? "")); setIdFilamento8(String(row.id_filamento8 ?? ""));
    setGramas1(String(row.gramas_filamento_1 ?? "")); setGramas2(String(row.gramas_filamento_2 ?? "")); setGramas3(String(row.gramas_filamento_3 ?? "")); setGramas4(String(row.gramas_filamento_4 ?? ""));
    setGramas5(String(row.gramas_filamento_5 ?? "")); setGramas6(String(row.gramas_filamento_6 ?? "")); setGramas7(String(row.gramas_filamento_7 ?? "")); setGramas8(String(row.gramas_filamento_8 ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este registro?")) return;
    try {
      setErro("");
      setMensagem("");
      const response = await fetch("/api/componentes?id=" + id, { method: "DELETE" });
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
        nome_componente,
        id_filamento1: id_filamento1 === "" ? null : Number(id_filamento1),
        id_filamento2: id_filamento2 === "" ? null : Number(id_filamento2),
        id_filamento3: id_filamento3 === "" ? null : Number(id_filamento3),
        id_filamento4: id_filamento4 === "" ? null : Number(id_filamento4),
        id_filamento5: id_filamento5 === "" ? null : Number(id_filamento5),
        id_filamento6: id_filamento6 === "" ? null : Number(id_filamento6),
        id_filamento7: id_filamento7 === "" ? null : Number(id_filamento7),
        id_filamento8: id_filamento8 === "" ? null : Number(id_filamento8),
        gramas_filamento_1: NumberOrBlank(gramas_filamento_1),
        gramas_filamento_2: NumberOrBlank(gramas_filamento_2),
        gramas_filamento_3: NumberOrBlank(gramas_filamento_3),
        gramas_filamento_4: NumberOrBlank(gramas_filamento_4),
        gramas_filamento_5: NumberOrBlank(gramas_filamento_5),
        gramas_filamento_6: NumberOrBlank(gramas_filamento_6),
        gramas_filamento_7: NumberOrBlank(gramas_filamento_7),
        gramas_filamento_8: NumberOrBlank(gramas_filamento_8),
      };
      const method = editingId ? "PUT" : "POST";
      if (editingId) payload.id_componente_stl = Number(editingId);

      const response = await fetch("/api/componentes", {
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

  const filamentos = [
    [id_filamento1, setIdFilamento1, gramas_filamento_1, setGramas1, 1],
    [id_filamento2, setIdFilamento2, gramas_filamento_2, setGramas2, 2],
    [id_filamento3, setIdFilamento3, gramas_filamento_3, setGramas3, 3],
    [id_filamento4, setIdFilamento4, gramas_filamento_4, setGramas4, 4],
    [id_filamento5, setIdFilamento5, gramas_filamento_5, setGramas5, 5],
    [id_filamento6, setIdFilamento6, gramas_filamento_6, setGramas6, 6],
    [id_filamento7, setIdFilamento7, gramas_filamento_7, setGramas7, 7],
    [id_filamento8, setIdFilamento8, gramas_filamento_8, setGramas8, 8],
  ] as const;

  return (
    <PageShell title="Componentes" description="Cadastro e consulta de componentes STL.">
      <div className="grid gap-6 xl:grid-cols-[560px_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-black">{editingId ? "Editar registro" : "Novo registro"}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Nome do componente</label>
              <input type="text" value={nome_componente} onChange={(e) => setNomeComponente(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Nome do componente" />
            </div>

            {filamentos.map(([idFilamento, setIdFilamento, gramas, setGramas, idx]) => (
              <div key={idx} className="rounded-xl border border-zinc-200 p-3">
                <div className="mb-2 text-sm font-semibold text-black">Filamento {idx}</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">ID Filamento {idx}</label>
                    <select value={idFilamento} onChange={(e) => setIdFilamento(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500">
                      <option value="">Selecione</option>
                      {(options?.filamentos || []).map((item: any) => (
                        <option key={String(item.id_filamento)} value={String(item.id_filamento)}>
                          {String(item.id_filamento)} - {String(item.nome_filamento)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Gramas Filamento {idx}</label>
                    <input type="number" value={gramas} onChange={(e) => setGramas(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder={`Gramas Filamento ${idx}`} />
                  </div>
                </div>
              </div>
            ))}

            <Feedback erro={erro} mensagem={mensagem} />
            <div className="flex gap-2">
              <button type="submit" disabled={salvando} className="flex-1 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60">
                {salvando ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
              </button>
              {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-50">Cancelar</button>}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-black">Lista</h2>
            <button onClick={reload} className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium text-black hover:bg-zinc-50">Atualizar</button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <LoadingOrEmpty loading={loading} empty={data.length === 0} loadingText="Carregando registros..." emptyText="Nenhum registro cadastrado.">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">ID</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Nome</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">F1</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">G1</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">F2</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">G2</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={String(index)}>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row.id_componente_stl ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row.nome_componente ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row.id_filamento1 ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row.gramas_filamento_1 ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row.id_filamento2 ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row.gramas_filamento_2 ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">
                        <ActionButtons onEdit={() => fillForEdit(row)} onDelete={() => handleDelete(String(row.id_componente_stl ?? ""))} />
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
