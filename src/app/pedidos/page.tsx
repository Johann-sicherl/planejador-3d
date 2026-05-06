"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ActionButtons,
  Feedback,
  getJson,
  LoadingOrEmpty,
  PageShell,
  useAuthGuard,
  useCrudList,
} from "../_shared";

type Registro = Record<string, unknown>;
type OptionItem = Record<string, unknown>;

type OptionsPayload = {
  clientes:   OptionItem[];
  arquivos3mf: OptionItem[];
  pedido3mfs: OptionItem[];
};

function asText(v: unknown) { return v == null ? "" : String(v); }

function labelFrom(row: OptionItem, fields: string[], fallback: string) {
  for (const f of fields) {
    const v = row[f];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return fallback;
}

const FIELD = "w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400";

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/pedidos");

  const [options,  setOptions]  = useState<OptionsPayload | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [id_cliente,            setId_cliente]            = useState("");
  const [ids3mf,                setIds3mf]                = useState<string[]>([""]); // múltiplos 3MFs
  const [data_solic,            setData_solic]            = useState("");
  const [data_entrega_prevista, setData_entrega_prevista] = useState("");
  const [data_entrega_realizada,setData_entrega_realizada]= useState("");

  useEffect(() => {
    getJson<OptionsPayload>("/api/options")
      .then((result) => setOptions(result[0] || null))
      .catch(() => {});
  }, []);

  const nomes = useMemo(() => {
    const clientes    = new Map<number, string>();
    const arquivos3mf = new Map<number, string>();
    for (const i of options?.clientes    || []) clientes.set(Number(i.id_cliente), labelFrom(i, ["nome_cliente","cliente","razao_social","nome"], "Cliente sem nome"));
    for (const i of options?.arquivos3mf || []) { const id=Number(i.id_3mf); if (!arquivos3mf.has(id)) arquivos3mf.set(id, labelFrom(i, ["nome_arquivo_3mf","nome_arquivo","filename"], "Arquivo 3MF")); }
    return { clientes, arquivos3mf };
  }, [options]);

  // 3MFs por pedido (do options.pedido3mfs)
  const pedido3mfsMap = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const i of options?.pedido3mfs || []) {
      const idPed = Number(i.id_pedido);
      const id3mf = Number(i.id_3mf);
      if (!map.has(idPed)) map.set(idPed, []);
      map.get(idPed)!.push(id3mf);
    }
    return map;
  }, [options]);

  function resetForm() {
    setEditingId(null);
    setId_cliente(""); setIds3mf([""]); setData_solic("");
    setData_entrega_prevista(""); setData_entrega_realizada("");
  }

  function fillForEdit(row: Registro) {
    const idPed = Number(row.id_pedido);
    setEditingId(asText(row.id_pedido));
    setId_cliente(asText(row.id_cliente));
    setData_solic(asText(row.data_solic));
    setData_entrega_prevista(asText(row.data_entrega_prevista));
    setData_entrega_realizada(asText(row.data_entrega_realizada));
    // Preenche 3MFs do pedido
    const ids = pedido3mfsMap.get(idPed) || [];
    setIds3mf(ids.length > 0 ? ids.map(String) : [""]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este pedido?")) return;
    try {
      setErro(""); setMensagem("");
      const r = await fetch("/api/pedidos?id=" + id, { method: "DELETE" });
      const res = await r.json();
      if (!r.ok || !res.ok) throw new Error(res.error || "Erro ao excluir.");
      // Exclui os 3MFs vinculados
      await fetch("/api/pedido-3mfs?id_pedido=" + id, { method: "DELETE" });
      setMensagem("Pedido excluído com sucesso.");
      if (editingId === id) resetForm();
      await reload();
      setOptions(null);
      getJson<OptionsPayload>("/api/options").then((r) => setOptions(r[0] || null)).catch(() => {});
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro ao excluir."); }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validos = ids3mf.filter((v) => v !== "");
    if (!validos.length) { setErro("Adicione ao menos 1 arquivo 3MF."); return; }
    try {
      setSalvando(true); setErro(""); setMensagem("");

      const payload: Record<string, unknown> = {
        id_cliente:             id_cliente  ? Number(id_cliente) : null,
        data_solic:             data_solic  || null,
        data_entrega_prevista:  data_entrega_prevista  || null,
        data_entrega_realizada: data_entrega_realizada || null,
      };

      const method = editingId ? "PUT" : "POST";
      if (editingId) payload.id_pedido = Number(editingId);

      const r = await fetch("/api/pedidos", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const res = await r.json();
      if (!r.ok || !res.ok) throw new Error(res.error || "Erro ao salvar.");

      const idPedido = editingId ? Number(editingId) : Number(res.data?.[0]?.id_pedido);

      // Substitui os 3MFs vinculados
      await fetch("/api/pedido-3mfs?id_pedido=" + idPedido, { method: "DELETE" });
      await fetch("/api/pedido-3mfs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validos.map((id3mf) => ({ id_pedido: idPedido, id_3mf: Number(id3mf) }))),
      });

      setMensagem(editingId ? "Pedido atualizado." : "Pedido salvo.");
      resetForm();
      await reload();
      getJson<OptionsPayload>("/api/options").then((r) => setOptions(r[0] || null)).catch(() => {});
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro ao salvar."); }
    finally { setSalvando(false); }
  }

  // Opções únicas de 3MF para o dropdown
  const opcoes3mf = useMemo(() => {
    const seen = new Set<number>();
    return (options?.arquivos3mf || []).filter((i) => {
      const id = Number(i.id_3mf);
      if (seen.has(id)) return false;
      seen.add(id); return true;
    });
  }, [options]);

  if (!ready) return <div>Carregando...</div>;

  return (
    <PageShell title="Pedidos" description="Cadastre os pedidos comerciais. A impressora será definida somente no Plano de Produção.">
      <Feedback erro={erro} mensagem={mensagem} />

      <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
        <h2 className="mb-4 text-xl font-black text-white">{editingId ? "Editar registro" : "Novo registro"}</h2>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Cliente</label>
            <select value={id_cliente} onChange={(e) => setId_cliente(e.target.value)} className={FIELD}>
              <option value="">Selecione</option>
              {(options?.clientes || []).map((i) => (
                <option key={String(i.id_cliente)} value={String(i.id_cliente)}>
                  {labelFrom(i, ["nome_cliente","cliente","razao_social","nome"], "Cliente sem nome")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Data da solicitação</label>
            <input type="date" value={data_solic} onChange={(e) => setData_solic(e.target.value)} className={FIELD} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Data entrega prevista</label>
            <input type="date" value={data_entrega_prevista} onChange={(e) => setData_entrega_prevista(e.target.value)} className={FIELD} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Data entrega realizada</label>
            <input type="date" value={data_entrega_realizada} onChange={(e) => setData_entrega_realizada(e.target.value)} className={FIELD} />
          </div>

          {/* Múltiplos 3MFs */}
          <div className="md:col-span-2 xl:col-span-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold text-slate-300">Arquivos 3MF *</label>
              <button type="button"
                onClick={() => setIds3mf((prev) => [...prev, ""])}
                className="flex items-center gap-1 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20">
                <Plus className="h-3.5 w-3.5" /> Adicionar 3MF
              </button>
            </div>
            <div className="space-y-2">
              {ids3mf.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={v} onChange={(e) => setIds3mf((prev) => prev.map((x, i) => i === idx ? e.target.value : x))}
                    className={`flex-1 ${FIELD}`}>
                    <option value="">Selecione o arquivo 3MF</option>
                    {opcoes3mf.map((i) => (
                      <option key={String(i.id_3mf)} value={String(i.id_3mf)}>
                        {labelFrom(i, ["nome_arquivo_3mf","nome_arquivo","filename"], "Arquivo 3MF")}
                      </option>
                    ))}
                  </select>
                  {ids3mf.length > 1 && (
                    <button type="button"
                      onClick={() => setIds3mf((prev) => prev.filter((_, i) => i !== idx))}
                      className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 md:col-span-2 xl:col-span-3">
            <button type="submit" disabled={salvando}
              className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
              {salvando ? "Salvando..." : editingId ? "Atualizar pedido" : "Salvar pedido"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/10">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Lista</h2>
          <button type="button" onClick={() => { reload(); getJson<OptionsPayload>("/api/options").then((r) => setOptions(r[0] || null)).catch(() => {}); }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
            Atualizar
          </button>
        </div>

        <LoadingOrEmpty loading={loading} empty={data.length === 0}
          loadingText="Carregando pedidos..." emptyText="Nenhum pedido cadastrado.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-slate-400">
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Arquivo(s) 3MF</th>
                  <th className="px-4 py-2">Data Solicitação</th>
                  <th className="px-4 py-2">Data Prevista</th>
                  <th className="px-4 py-2">Data Realizada</th>
                  <th className="px-4 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const ids3mfDoPedido = pedido3mfsMap.get(Number(row.id_pedido)) || [];
                  return (
                    <tr key={String(row.id_pedido)} className="bg-white/[0.035] text-slate-200">
                      <td className="rounded-l-2xl px-4 py-3 font-bold text-white">
                        {nomes.clientes.get(Number(row.id_cliente)) || asText(row.id_cliente) || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {ids3mfDoPedido.length === 0 ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {ids3mfDoPedido.map((id3mf) => (
                              <span key={id3mf} className="truncate text-xs text-slate-300">
                                {nomes.arquivos3mf.get(id3mf) || `3MF ${id3mf}`}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{asText(row.data_solic)       || "—"}</td>
                      <td className="px-4 py-3">{asText(row.data_entrega_prevista)  || "—"}</td>
                      <td className="px-4 py-3">{asText(row.data_entrega_realizada) || "—"}</td>
                      <td className="rounded-r-2xl px-4 py-3">
                        <ActionButtons
                          onEdit={() => fillForEdit(row)}
                          onDelete={() => handleDelete(asText(row.id_pedido))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </LoadingOrEmpty>
      </section>
    </PageShell>
  );
}
