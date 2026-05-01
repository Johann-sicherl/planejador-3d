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

type Filamento = { id_filamento: number; nome_filamento: string; material_filamento: string | null; cor_filamento: string | null};
type Carretel = { id_carretel: number; marca_carretel: string; peso_carretel_g: number };

type RegistroEstoque = {
  id_filamento?: number | null;
  qtd_estoque_gramas?: number | null;
  localizacao?: string | null;
  peso_com_carretel_g?: number | null;
  id_carretel?: number | null;
  carretel?: Carretel | null;
};

type RegistroCarretel = {
  id_carretel?: number;
  marca_carretel?: string | null;
  peso_carretel_g?: number | null;
};

const FIELD_CLASS =
  "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400";

export default function Page() {
  const { ready } = useAuthGuard();
  const { data: estoque, loading: loadingEstoque, erro: erroEstoque, setErro: setErroEstoque, reload: reloadEstoque } =
    useCrudList<RegistroEstoque>("/api/estoque");
  const { data: carreteis, loading: loadingCarreteis, erro: erroCarreteis, setErro: setErroCarreteis, reload: reloadCarreteis } =
    useCrudList<RegistroCarretel>("/api/pesos-carreteis");

  const [filamentos, setFilamentos] = useState<Filamento[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // Estoque form
  const [editingEstoqueId, setEditingEstoqueId] = useState<string | null>(null);
  const [idFilamento, setIdFilamento] = useState("");
  const [pesoComCarretelG, setPesoComCarretelG] = useState("");
  const [idCarretel, setIdCarretel] = useState("");
  const [localizacao, setLocalizacao] = useState("");

  // Carretel form
  const [editingCarretelId, setEditingCarretelId] = useState<string | null>(null);
  const [marcaCarretel, setMarcaCarretel] = useState("");
  const [pesoCarretelG, setPesoCarretelG] = useState("");

  useEffect(() => {
    fetch("/api/filamentos", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => setFilamentos(res.data || []))
      .catch(() => {});
  }, []);

  // Calculos de peso
  const pesoCarretelSelecionado = carreteis.find((c) => String(c.id_carretel) === idCarretel);
  const pesoBruto = NumberOrBlank(pesoComCarretelG);
  const taraCarretel = pesoCarretelSelecionado?.peso_carretel_g ?? null;
  const pesoSemCarretel = pesoBruto !== null && taraCarretel !== null
    ? Math.max(0, Number((pesoBruto - taraCarretel).toFixed(1)))
    : null;

  function resetEstoqueForm() {
    setEditingEstoqueId(null);
    setIdFilamento(""); setPesoComCarretelG(""); setIdCarretel(""); setLocalizacao("");
  }

  function fillEstoqueForEdit(row: RegistroEstoque) {
    setEditingEstoqueId(String(row.id_filamento ?? ""));
    setIdFilamento(String(row.id_filamento ?? ""));
    setPesoComCarretelG(String(row.peso_com_carretel_g ?? ""));
    setIdCarretel(String(row.id_carretel ?? ""));
    setLocalizacao(String(row.localizacao ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleEstoqueDelete(id: string) {
    if (!confirm("Deseja realmente excluir este registro de estoque?")) return;
    try {
      setErroEstoque(""); setMensagem("");
      const r = await fetch("/api/estoque?id=" + id, { method: "DELETE" });
      const res = await r.json();
      if (!r.ok || !res.ok) throw new Error(res.error || "Erro ao excluir.");
      setMensagem("Registro excluido com sucesso.");
      if (editingEstoqueId === id) resetEstoqueForm();
      await reloadEstoque();
    } catch (err) {
      setErroEstoque(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleEstoqueSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      setSalvando(true); setErroEstoque(""); setMensagem("");
      const payload: Record<string, unknown> = {
        id_filamento: idFilamento ? Number(idFilamento) : null,
        peso_com_carretel_g: NumberOrBlank(pesoComCarretelG),
        qtd_estoque_gramas: pesoSemCarretel,
        id_carretel: idCarretel ? Number(idCarretel) : null,
        localizacao: localizacao || null,
      };
      const method = editingEstoqueId ? "PUT" : "POST";
      if (editingEstoqueId) payload.id_filamento = Number(editingEstoqueId);
      const r = await fetch("/api/estoque", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const res = await r.json();
      if (!r.ok || !res.ok) throw new Error(res.error || "Erro ao salvar.");
      setMensagem(editingEstoqueId ? "Estoque atualizado." : "Estoque salvo.");
      resetEstoqueForm(); await reloadEstoque();
    } catch (err) {
      setErroEstoque(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  // Carretel CRUD
  function resetCarretelForm() {
    setEditingCarretelId(null); setMarcaCarretel(""); setPesoCarretelG("");
  }
  function fillCarretelForEdit(row: RegistroCarretel) {
    setEditingCarretelId(String(row.id_carretel ?? ""));
    setMarcaCarretel(String(row.marca_carretel ?? ""));
    setPesoCarretelG(String(row.peso_carretel_g ?? ""));
  }
  function filamentoLabel(f?: Filamento | null) {
  if (!f) return "-";

  return [
    f.nome_filamento,
    f.material_filamento,
    f.cor_filamento,
  ]
    .filter(Boolean)
    .join(" - ");
}
  async function handleCarretelDelete(id: string) {
    if (!confirm("Excluir este peso de carretel?")) return;
    try {
      setErroCarreteis(""); setMensagem("");
      const r = await fetch("/api/pesos-carreteis?id=" + id, { method: "DELETE" });
      const res = await r.json();
      if (!r.ok || !res.ok) throw new Error(res.error || "Erro ao excluir.");
      setMensagem("Carretel excluido.");
      if (editingCarretelId === id) resetCarretelForm();
      await reloadCarreteis();
    } catch (err) {
      setErroCarreteis(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }
  async function handleCarretelSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      setSalvando(true); setErroCarreteis(""); setMensagem("");
      const payload: Record<string, unknown> = {
        marca_carretel: marcaCarretel || null,
        peso_carretel_g: NumberOrBlank(pesoCarretelG),
      };
      const method = editingCarretelId ? "PUT" : "POST";
      if (editingCarretelId) payload.id_carretel = Number(editingCarretelId);
      const r = await fetch("/api/pesos-carreteis", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const res = await r.json();
      if (!r.ok || !res.ok) throw new Error(res.error || "Erro ao salvar.");
      setMensagem(editingCarretelId ? "Carretel atualizado." : "Carretel salvo.");
      resetCarretelForm(); await reloadCarreteis();
    } catch (err) {
      setErroCarreteis(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  if (!ready) return <main className="min-h-screen p-8 text-slate-100">Carregando...</main>;

  return (
    <PageShell title="Estoque" description="Controle de filamentos em estoque. Pese o carretel completo — o sistema desconta a tara automaticamente.">
      <Feedback erro={""} mensagem={mensagem} />

      {/* ── ESTOQUE ───────────────────────────────────────── */}
      <GlassCard>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">{editingEstoqueId ? "Editar estoque" : "Novo registro de estoque"}</h2>
            <p className="mt-1 text-sm text-slate-400">
              Informe o filamento, pese o carretel completo e selecione a marca do carretel para calcular o filamento liquido.
            </p>
          </div>
          {editingEstoqueId && (
            <button onClick={resetEstoqueForm}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
              Cancelar edicao
            </button>
          )}
        </div>

        <form onSubmit={handleEstoqueSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Filamento</label>
            <select value={idFilamento} onChange={(e) => setIdFilamento(e.target.value)} className={FIELD_CLASS} required>
              <option value="">Selecione</option>
              {filamentos.map((f) => (
                <option key={f.id_filamento} value={f.id_filamento}>
                  {`${f.nome_filamento} - ${f.material_filamento} - ${f.cor_filamento}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Marca do carretel (tara)</label>
            <select value={idCarretel} onChange={(e) => setIdCarretel(e.target.value)} className={FIELD_CLASS}>
              <option value="">Sem carretel</option>
              {carreteis.map((c) => (
                <option key={c.id_carretel} value={String(c.id_carretel)}>
                  {c.marca_carretel} — {c.peso_carretel_g} g
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Peso com carretel (g)</label>
            <input type="number" value={pesoComCarretelG} onChange={(e) => setPesoComCarretelG(e.target.value)}
              className={FIELD_CLASS} placeholder="Ex.: 1180" min="0" step="0.1" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Filamento liquido (g)</label>
            <div className={`flex items-center rounded-2xl border px-4 py-3 font-black text-lg ${
              pesoSemCarretel !== null
                ? pesoSemCarretel > 200
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : pesoSemCarretel > 50
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-red-500/40 bg-red-500/10 text-red-300"
                : "border-white/10 bg-white/[0.04] text-slate-500"
            }`}>
              {pesoSemCarretel !== null
                ? `${pesoSemCarretel.toLocaleString("pt-BR")} g`
                : "—"}
              {pesoSemCarretel !== null && taraCarretel !== null && (
                <span className="ml-auto text-xs font-normal opacity-70">
                  {pesoBruto}g - {taraCarretel}g
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Localizacao</label>
            <input value={localizacao} onChange={(e) => setLocalizacao(e.target.value)}
              className={FIELD_CLASS} placeholder="Ex.: Prateleira A2" />
          </div>

          <div className="flex items-end md:col-span-2 xl:col-span-3">
            <button type="submit" disabled={salvando}
              className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 disabled:opacity-60">
              {salvando ? "Salvando..." : editingEstoqueId ? "Atualizar estoque" : "Salvar estoque"}
            </button>
          </div>
        </form>

        {erroEstoque && <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{erroEstoque}</div>}
      </GlassCard>

      <GlassCard>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Estoque atual</h2>
            <p className="mt-1 text-sm text-slate-400">Saldo de filamentos com peso liquido calculado automaticamente.</p>
          </div>
          <button onClick={reloadEstoque}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
            Atualizar
          </button>
        </div>
        <LoadingOrEmpty loading={loadingEstoque} empty={estoque.length === 0}
          loadingText="Carregando estoque..." emptyText="Nenhum registro de estoque.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-slate-400">
                  <th className="px-4 py-2">Filamento</th>
                  <th className="px-4 py-2">Localizacao</th>
                  <th className="px-4 py-2">Marca carretel</th>
                  <th className="px-4 py-2">Peso c/ carretel (g)</th>
                  <th className="px-4 py-2">Tara (g)</th>
                  <th className="px-4 py-2">Filamento liquido (g)</th>
                  <th className="px-4 py-2">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {estoque.map((row, i) => {
                  const tara = row.carretel?.peso_carretel_g ?? null;
                  const bruto = row.peso_com_carretel_g ?? null;
                  const liquido = bruto !== null && tara !== null
                    ? Math.max(0, Number((bruto - tara).toFixed(1)))
                    : (row.qtd_estoque_gramas ?? null);
                  return (
                    <tr key={String(row.id_filamento ?? i)} className="bg-white/[0.035] text-slate-200">
                      <td className="rounded-l-2xl px-4 py-3 font-bold text-white">
                        {filamentos.find((f) => f.id_filamento === row.id_filamento)?.nome_filamento ?? String(row.id_filamento ?? "-")}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{row.localizacao || "-"}</td>
                      <td className="px-4 py-3">{row.carretel?.marca_carretel || "-"}</td>
                      <td className="px-4 py-3">{bruto != null ? `${bruto} g` : "-"}</td>
                      <td className="px-4 py-3 text-slate-400">{tara != null ? `${tara} g` : "-"}</td>
                      <td className="px-4 py-3">
                        {liquido != null ? (
                          <span className={`font-black ${liquido > 200 ? "text-emerald-300" : liquido > 50 ? "text-amber-300" : "text-red-300"}`}>
                            {liquido.toLocaleString("pt-BR")} g
                          </span>
                        ) : "-"}
                      </td>
                      <td className="rounded-r-2xl px-4 py-3">
                        <ActionButtons
                          onEdit={() => fillEstoqueForEdit(row)}
                          onDelete={() => handleEstoqueDelete(String(row.id_filamento ?? ""))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </LoadingOrEmpty>
      </GlassCard>

      {/* ── PESOS DE CARRETEIS ───────────────────────────── */}
      <GlassCard>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Pesos dos carreteis (tara)</h2>
            <p className="mt-1 text-sm text-slate-400">
              Cadastre o peso vazio de cada marca de carretel para usar no calculo automatico do filamento liquido.
            </p>
          </div>
          {editingCarretelId && (
            <button onClick={resetCarretelForm}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
              Cancelar edicao
            </button>
          )}
        </div>

        <form onSubmit={handleCarretelSubmit} className="mb-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Marca / Nome do carretel *</label>
            <input value={marcaCarretel} onChange={(e) => setMarcaCarretel(e.target.value)}
              className={FIELD_CLASS} placeholder="Ex.: 3D LAB" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Peso do carretel vazio (g) *</label>
            <input type="number" value={pesoCarretelG} onChange={(e) => setPesoCarretelG(e.target.value)}
              className={FIELD_CLASS} placeholder="Ex.: 255" min="0" step="0.1" required />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={salvando}
              className="rounded-2xl bg-violet-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400 disabled:opacity-60">
              {salvando ? "Salvando..." : editingCarretelId ? "Atualizar carretel" : "Salvar carretel"}
            </button>
          </div>
        </form>

        {erroCarreteis && <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{erroCarreteis}</div>}

        <LoadingOrEmpty loading={loadingCarreteis} empty={carreteis.length === 0}
          loadingText="Carregando carreteis..." emptyText="Nenhum carretel cadastrado.">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-slate-400">
                  <th className="px-4 py-2">Marca / Nome</th>
                  <th className="px-4 py-2">Peso vazio (g)</th>
                  <th className="px-4 py-2">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {carreteis.map((row) => (
                  <tr key={String(row.id_carretel)} className="bg-white/[0.035] text-slate-200">
                    <td className="rounded-l-2xl px-4 py-3 font-bold text-white">{row.marca_carretel || "-"}</td>
                    <td className="px-4 py-3 font-mono text-violet-300">{row.peso_carretel_g != null ? `${row.peso_carretel_g} g` : "-"}</td>
                    <td className="rounded-r-2xl px-4 py-3">
                      <ActionButtons
                        onEdit={() => fillCarretelForEdit(row)}
                        onDelete={() => handleCarretelDelete(String(row.id_carretel ?? ""))}
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
