"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ActionButtons,
  Feedback,
  GlassCard,
  LoadingOrEmpty,
  PageShell,
  useAuthGuard,
  useCrudList,
} from "../_shared";

type LinhaDB = {
  id_linha: number;
  id_3mf: number;
  nome_arquivo_3mf: string | null;
  id_componente_stl: number | null;
  qtd_componente: number | null;
};

type Componente = {
  id_componente_stl: number;
  nome_componente: string;
};

type Arquivo3mf = { id_3mf: number; nome: string; linhas: LinhaDB[] };

function agrupar(linhas: LinhaDB[]): Arquivo3mf[] {
  const map = new Map<number, LinhaDB[]>();
  for (const l of linhas) {
    const id = l.id_3mf;
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(l);
  }
  return [...map.values()].map((ls) => ({
    id_3mf: ls[0].id_3mf,
    nome:   ls[0].nome_arquivo_3mf ?? "(sem nome)",
    linhas: ls,
  }));
}

const FIELD = "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400";

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<LinhaDB>("/api/arquivos-3mf");
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [salvando,    setSalvando]    = useState(false);
  const [mensagem,    setMensagem]    = useState("");

  const [nomeArquivo, setNomeArquivo] = useState("");
  const [slots, setSlots] = useState<{ id_componente_stl: string; qtd: string }[]>([
    { id_componente_stl: "", qtd: "1" },
  ]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editComp,  setEditComp]  = useState("");
  const [editQtd,   setEditQtd]   = useState("");

  useEffect(() => {
    fetch("/api/options", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        const comps: Componente[] = (res.data?.[0]?.componentes || []).map((c: Record<string, unknown>) => ({
          id_componente_stl: Number(c.id_componente_stl),
          nome_componente:   String(c.nome_componente ?? c.nome ?? c.id_componente_stl),
        }));
        setComponentes(comps);
      })
      .catch(() => {});
  }, []);

  function addSlot() { setSlots((p) => [...p, { id_componente_stl: "", qtd: "1" }]); }
  function removeSlot(i: number) { setSlots((p) => p.filter((_, j) => j !== i)); }
  function updateSlot(i: number, f: "id_componente_stl" | "qtd", v: string) {
    setSlots((p) => p.map((s, j) => j === i ? { ...s, [f]: v } : s));
  }
  function resetForm() { setNomeArquivo(""); setSlots([{ id_componente_stl: "", qtd: "1" }]); setEditingId(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeArquivo.trim()) { setErro("Informe o nome do arquivo 3MF."); return; }
    const validos = slots.filter((s) => s.id_componente_stl !== "");
    if (!validos.length) { setErro("Adicione ao menos 1 componente STL."); return; }
    try {
      setSalvando(true); setErro(""); setMensagem("");
      const res = await fetch("/api/arquivos-3mf", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_arquivo_3mf: nomeArquivo.trim(),
          componentes: validos.map((s) => ({ id_componente_stl: Number(s.id_componente_stl), qtd_componente: Number(s.qtd) || 1 })),
        }),
      });
      const r = await res.json();
      if (!res.ok || !r.ok) throw new Error(r.error || "Erro ao salvar.");
      setMensagem("Arquivo 3MF salvo com sucesso."); resetForm(); await reload();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro."); }
    finally { setSalvando(false); }
  }

  async function handleDeleteArquivo(id3mf: number, nome: string) {
    if (!confirm(`Excluir o arquivo "${nome}" e todos os seus componentes?`)) return;
    try {
      setErro(""); setMensagem("");
      const res = await fetch("/api/arquivos-3mf?id_3mf=" + id3mf, { method: "DELETE" });
      const r = await res.json();
      if (!res.ok || !r.ok) throw new Error(r.error || "Erro ao excluir.");
      setMensagem("Arquivo excluído."); await reload();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro."); }
  }

  async function handleDeleteLinha(idLinha: number) {
    if (!confirm("Remover este componente do arquivo?")) return;
    try {
      setErro(""); setMensagem("");
      const res = await fetch("/api/arquivos-3mf?id_linha=" + idLinha, { method: "DELETE" });
      const r = await res.json();
      if (!res.ok || !r.ok) throw new Error(r.error || "Erro ao excluir.");
      setMensagem("Componente removido."); await reload();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro."); }
  }

  async function saveEditLinha() {
    if (!editingId) return;
    try {
      setSalvando(true); setErro(""); setMensagem("");
      const res = await fetch("/api/arquivos-3mf", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_linha: editingId, id_componente_stl: editComp ? Number(editComp) : null, qtd_componente: editQtd ? Number(editQtd) : null }),
      });
      const r = await res.json();
      if (!res.ok || !r.ok) throw new Error(r.error || "Erro ao atualizar.");
      setMensagem("Componente atualizado."); setEditingId(null); await reload();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro."); }
    finally { setSalvando(false); }
  }

  if (!ready) return <main className="min-h-screen p-8 text-slate-100">Carregando...</main>;

  const arquivos = agrupar(data);

  return (
    <PageShell title="Arquivos 3MF" description="Cadastre o arquivo 3MF e todos os componentes STL que ele contém.">
      <Feedback erro={erro} mensagem={mensagem} />

      <GlassCard>
        <h2 className="mb-5 text-xl font-black text-white">Novo arquivo 3MF</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Nome do arquivo 3MF *</label>
            <input value={nomeArquivo} onChange={(e) => setNomeArquivo(e.target.value)}
              className={FIELD} placeholder="Ex.: MONTAGEM CAIXA ORGANIZADORA.3mf" required />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-bold text-slate-300">Componentes STL *</label>
              <button type="button" onClick={addSlot}
                className="flex items-center gap-1 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20">
                <Plus className="h-3.5 w-3.5" /> Adicionar componente
              </button>
            </div>
            <div className="space-y-2">
              {slots.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={slot.id_componente_stl} onChange={(e) => updateSlot(idx, "id_componente_stl", e.target.value)} className={FIELD}>
                    <option value="">Selecione o componente STL</option>
                    {componentes.map((c) => (
                      <option key={c.id_componente_stl} value={c.id_componente_stl}>{c.nome_componente}</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={slot.qtd} onChange={(e) => updateSlot(idx, "qtd", e.target.value)}
                    className="w-24 shrink-0 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-slate-100 outline-none focus:border-cyan-400"
                    placeholder="Qtd" />
                  {slots.length > 1 && (
                    <button type="button" onClick={() => removeSlot(idx)}
                      className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-red-300 hover:bg-red-500/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={salvando}
              className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
              {salvando ? "Salvando..." : "Salvar arquivo 3MF"}
            </button>
            <button type="button" onClick={resetForm}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/10">
              Limpar
            </button>
          </div>
        </form>
      </GlassCard>

      <GlassCard>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Arquivos cadastrados</h2>
          <button type="button" onClick={reload}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
            Atualizar
          </button>
        </div>

        <LoadingOrEmpty loading={loading} empty={arquivos.length === 0}
          loadingText="Carregando arquivos..." emptyText="Nenhum arquivo 3MF cadastrado.">
          <div className="space-y-4">
            {arquivos.map((arq) => (
              <div key={arq.id_3mf} className="rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <span className="font-black text-white">{arq.nome}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs text-slate-400">
                      {arq.linhas.length} componente{arq.linhas.length !== 1 ? "s" : ""}
                    </span>
                    <button type="button" onClick={() => handleDeleteArquivo(arq.id_3mf, arq.nome)}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20">
                      Excluir arquivo
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-white/5">
                  {arq.linhas.map((linha) => (
                    <div key={linha.id_linha} className="px-4 py-3">
                      {editingId === linha.id_linha ? (
                        <div className="flex items-center gap-2">
                          <select value={editComp} onChange={(e) => setEditComp(e.target.value)}
                            className="flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400">
                            <option value="">Selecione</option>
                            {componentes.map((c) => (
                              <option key={c.id_componente_stl} value={c.id_componente_stl}>{c.nome_componente}</option>
                            ))}
                          </select>
                          <input type="number" min="1" value={editQtd} onChange={(e) => setEditQtd(e.target.value)}
                            className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                          <button type="button" onClick={saveEditLinha} disabled={salvando}
                            className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300">Salvar</button>
                          <button type="button" onClick={() => setEditingId(null)}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                          <span>{componentes.find((c) => c.id_componente_stl === linha.id_componente_stl)?.nome_componente ?? `Componente ${linha.id_componente_stl}`}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">Qtd: <span className="font-bold text-slate-200">{linha.qtd_componente ?? 1}</span></span>
                            <ActionButtons onEdit={() => { setEditingId(linha.id_linha); setEditComp(String(linha.id_componente_stl ?? "")); setEditQtd(String(linha.qtd_componente ?? "1")); }}
                              onDelete={() => handleDeleteLinha(linha.id_linha)} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </LoadingOrEmpty>
      </GlassCard>
    </PageShell>
  );
}
