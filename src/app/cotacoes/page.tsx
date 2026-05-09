"use client";

import { useEffect, useState } from "react";
import {
  ActionButtons,
  Feedback,
  GlassCard,
  LoadingOrEmpty,
  PageShell,
  useAuthGuard,
  useCrudList,
} from "../_shared";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Registro = Record<string, string | number | null>;
type OItem    = Record<string, unknown>;

// Parâmetros globais editáveis (espelham a planilha)
type Params = {
  custo_kwh:        number; // R$/kWh
  kw_maquina:       number; // Watts da máquina
  desgaste_hora:    number; // R$/hora de desgaste
  tempo_horas:      number; // Horas de impressão
  qtd_pedido:       number; // Quantidade de peças
};

// Faixas de preço geradas (espelham a planilha)
type Faixa = {
  label:      string;
  mult:       number;
  preco_unit: number;
  custo_unit: number;
  lucro_liq:  number;
  lucro_pct:  number;
  vr_total:   number;
  lucro_total:number;
  valor_hora: number;
};

const FAIXAS_DEF = [
  { label: "Variável",            mult: 2   },
  { label: "Mínimo Escala",       mult: 2.5 },
  { label: "Mínimo",              mult: 3   },
  { label: "Médio Escala",        mult: 3.5 },
  { label: "Médio",               mult: 4   },
  { label: "Máximo Escala",       mult: 5   },
  { label: "Máximo",              mult: 6   },
  { label: "Máximo Hyper",        mult: 8   },
  { label: "Máximo Ultra Hyper",  mult: 10  },
];

const PARAMS_DEFAULT: Params = {
  custo_kwh:     1.16,
  kw_maquina:    630,
  desgaste_hora: 1.0,
  tempo_horas:   0,
  qtd_pedido:    1,
};

const FIELD = "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400";
const FIELD_SM = "w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-slate-100 text-sm outline-none focus:border-cyan-400";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Cálculo principal (lógica da planilha) ──────────────────────────────────

function calcularFaixas(
  custo_mat_prima: number, // custo total de material (R$)
  params: Params,
): Faixa[] {
  const { custo_kwh, kw_maquina, desgaste_hora, tempo_horas, qtd_pedido } = params;

  // Custos unitários
  const custo_elet_hora  = (kw_maquina / 1000) * custo_kwh;          // R$/hora elétrico
  const custo_elet_peca  = custo_elet_hora * tempo_horas;             // R$ elétrico por peça
  const custo_desgaste   = desgaste_hora  * tempo_horas;              // R$ desgaste por peça
  const custo_unit_base  = custo_mat_prima + custo_elet_peca + custo_desgaste;

  return FAIXAS_DEF.map(({ label, mult }) => {
    const preco_unit  = custo_unit_base * mult;
    const lucro_liq   = preco_unit * 0.7;                              // ~70% do preço = lucro líquido
    const lucro_pct   = custo_unit_base > 0 ? lucro_liq / custo_unit_base : 0;
    const vr_total    = preco_unit * qtd_pedido;
    const lucro_total = (preco_unit - custo_unit_base) * qtd_pedido;
    const valor_hora  = tempo_horas > 0 ? preco_unit / (tempo_horas * 4) : 0;

    return {
      label, mult,
      preco_unit:  Math.round(preco_unit  * 100) / 100,
      custo_unit:  Math.round(custo_unit_base * 100) / 100,
      lucro_liq:   Math.round(lucro_liq   * 100) / 100,
      lucro_pct:   Math.round(lucro_pct   * 100) / 100,
      vr_total:    Math.round(vr_total    * 100) / 100,
      lucro_total: Math.round(lucro_total * 100) / 100,
      valor_hora:  Math.round(valor_hora  * 100) / 100,
    };
  });
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } =
    useCrudList<Registro>("/api/cotacoes");

  const [options,  setOptions]  = useState<{ componentes: OItem[]; impressoras: OItem[]; filamentos: OItem[]; pedidos: OItem[]; pedido3mfs: OItem[]; arquivos3mf: OItem[] } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // Seleção de contexto
  const [idComp,   setIdComp]   = useState("");
  const [idPedido, setIdPedido] = useState("");
  const [idImp,    setIdImp]    = useState("");

  // Parâmetros (editáveis pelo usuário, pré-preenchidos do banco quando possível)
  const [params, setParams] = useState<Params>(PARAMS_DEFAULT);

  // Custo de matéria prima calculado do componente
  const [custoMat, setCustoMat] = useState<number | null>(null);
  const [pesoTotal, setPesoTotal] = useState<number | null>(null);

  // Faixa escolhida para salvar
  const [faixaEscolhida, setFaixaEscolhida] = useState<Faixa | null>(null);

  useEffect(() => {
    fetch("/api/options", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => setOptions(res.data?.[0] || null))
      .catch(() => {});
  }, []);

  // Quando componente muda → preenche peso e custo de material
  useEffect(() => {
    if (!idComp || !options) { setCustoMat(null); setPesoTotal(null); return; }

    const comp = options.componentes.find(
      (c) => String(c.id_componente_stl) === idComp
    );
    if (!comp) { setCustoMat(null); setPesoTotal(null); return; }

    let pesoTotal = 0;
    let custoTotal = 0;

    for (let i = 1; i <= 8; i++) {
      const idFil   = comp[`id_filamento${i}`] as number | null;
      const gramas  = comp[`gramas_filamento_${i}`] as number | null;
      if (!idFil || !gramas || gramas <= 0) continue;

      const fil = options.filamentos.find(
        (f) => Number(f.id_filamento) === Number(idFil)
      );
      const custoKg = fil ? Number(fil.custo_medio_brl) || 0 : 0;
      pesoTotal  += gramas;
      custoTotal += (gramas / 1000) * custoKg;
    }

    setPesoTotal(pesoTotal > 0 ? pesoTotal : null);
    setCustoMat(custoTotal > 0 ? custoTotal : null);

    // Preenche tempo de impressão convertendo minutos → horas (2 casas decimais)
    const minutos = Number(comp.tempo_impressao_min ?? 0);
    if (minutos > 0) {
      setParams((p) => ({ ...p, tempo_horas: Math.round((minutos / 60) * 100) / 100 }));
    }
  }, [idComp, options]);

  // Quando pedido muda → soma filamentos × qtd de todos os STLs de todos os 3MFs
  useEffect(() => {
    if (!idPedido || !options) { if (!idComp) { setCustoMat(null); setPesoTotal(null); } return; }
    if (idComp) return; // se componente está selecionado, ele tem prioridade

    // ids dos 3MFs deste pedido
    const ids3mf = (options.pedido3mfs || [])
      .filter((p) => String(p.id_pedido) === idPedido)
      .map((p) => Number(p.id_3mf));

    if (!ids3mf.length) { setCustoMat(null); setPesoTotal(null); return; }

    // linhas do cadastro_3mf (cada linha = 1 STL dentro de 1 3MF)
    const linhas = (options.arquivos3mf || []).filter((a) => ids3mf.includes(Number(a.id_3mf)));

    let pesoAcc  = 0;
    let custoAcc = 0;
    let tempoAcc = 0;

    for (const linha of linhas) {
      const comp = (options.componentes || []).find(
        (c) => Number(c.id_componente_stl) === Number(linha.id_componente_stl)
      );
      if (!comp) continue;
      const qtd = Number(linha.qtd_componente ?? 1);

      for (let i = 1; i <= 8; i++) {
        const idFil  = Number(comp[`id_filamento${i}`] ?? 0);
        const gramas = Number(comp[`gramas_filamento_${i}`] ?? 0);
        if (!idFil || gramas <= 0) continue;
        const fil = (options.filamentos || []).find((f) => Number(f.id_filamento) === idFil);
        const custoKg = fil ? Number(fil.custo_medio_brl) || 0 : 0;
        pesoAcc  += gramas * qtd;
        custoAcc += (gramas / 1000) * custoKg * qtd;
      }

      const minutos = Number(comp.tempo_impressao_min ?? 0);
      tempoAcc += (minutos / 60) * qtd;
    }

    setPesoTotal(pesoAcc > 0 ? Math.round(pesoAcc * 1000) / 1000 : null);
    setCustoMat(custoAcc > 0 ? Math.round(custoAcc * 1000) / 1000 : null);
    if (tempoAcc > 0) {
      setParams((p) => ({ ...p, tempo_horas: Math.round(tempoAcc * 100) / 100 }));
    }
  }, [idPedido, idComp, options]);
  function handleSelectComp(v: string) {
    setIdComp(v);
    if (v) { setIdPedido(""); }
  }

  function handleSelectPedido(v: string) {
    setIdPedido(v);
    if (v) { setIdComp(""); setCustoMat(null); setPesoTotal(null); }
  }

  const faixas: Faixa[] = (custoMat !== null && params.tempo_horas > 0)
    ? calcularFaixas(custoMat, params)
    : [];

  function nomeComp(id: number | string) {
    const c = options?.componentes.find(
      (x) => String(x.id_componente_stl) === String(id)
    );
    return c ? String(c.nome_componente ?? id) : String(id);
  }

  function nomeImp(id: number | string) {
    const i = options?.impressoras.find(
      (x) => String(x.id_impressora) === String(id)
    );
    return i ? String(i.nome_impressora ?? id) : String(id);
  }

  async function salvarCotacao(faixa: Faixa) {
    if (!idComp && !idPedido) { setErro("Selecione um componente STL ou um pedido."); return; }
    try {
      setSalvando(true); setErro(""); setMensagem("");
      const now = new Date();
      const payload = {
        id_componente_stl: idComp ? Number(idComp) : null,
        id_pedido:         idPedido ? Number(idPedido) : null,
        id_impressora:     idImp ? Number(idImp) : null,
        custo_geral:       faixa.custo_unit,
        valor_venda:       faixa.preco_unit,
        lucro_geral:       faixa.lucro_total,
        dia_cot:           now.getDate(),
        mes_cot:           now.getMonth() + 1,
        ano_cot:           now.getFullYear(),
      };
      const res    = await fetch("/api/cotacoes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || "Erro ao salvar.");
      setMensagem(`Cotação "${faixa.label}" salva com sucesso.`);
      setFaixaEscolhida(faixa);
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta cotação?")) return;
    try {
      setErro(""); setMensagem("");
      const res = await fetch("/api/cotacoes?id=" + id, { method: "DELETE" });
      const r   = await res.json();
      if (!res.ok || !r.ok) throw new Error(r.error || "Erro ao excluir.");
      setMensagem("Cotação excluída."); await reload();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro ao excluir."); }
  }

  if (!ready) return <main className="min-h-screen p-8 text-slate-100">Carregando...</main>;

  return (
    <PageShell
      title="Cotações"
      description="Precificação automática baseada nos custos reais de filamento, eletricidade e desgaste da máquina."
    >
      <Feedback erro={erro} mensagem={mensagem} />

      {/* ── CALCULADORA ──────────────────────────────────────── */}
      <GlassCard>
        <h2 className="mb-6 text-xl font-black text-white">Calculadora de Preços</h2>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Coluna esquerda — entradas */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Componente e impressora</h3>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">Componente STL *</label>
              <select value={idComp} onChange={(e) => handleSelectComp(e.target.value)} className={FIELD}>
                <option value="">Selecione</option>
                {(options?.componentes || []).map((c) => (
                  <option key={String(c.id_componente_stl)} value={String(c.id_componente_stl)}>
                    {String(c.nome_componente ?? c.id_componente_stl)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Pedido completo
                <span className="ml-2 text-[10px] font-normal text-slate-500">— soma todos os STLs × qtd</span>
              </label>
              <select value={idPedido} onChange={(e) => handleSelectPedido(e.target.value)} className={FIELD}>
                <option value="">Selecione (opcional)</option>
                {(options?.pedidos || []).map((p) => (
                  <option key={String(p.id_pedido)} value={String(p.id_pedido)}>
                    {String(p.label_pedido ?? `Pedido ${p.id_pedido}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">Impressora</label>
              <select value={idImp} onChange={(e) => setIdImp(e.target.value)} className={FIELD}>
                <option value="">Selecione (opcional)</option>
                {(options?.impressoras || []).map((i) => (
                  <option key={String(i.id_impressora)} value={String(i.id_impressora)}>
                    {String(i.nome_impressora ?? i.id_impressora)}
                  </option>
                ))}
              </select>
            </div>

            {/* Resumo do componente ou pedido */}
            {(idComp || idPedido) && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {idPedido ? "Dados do pedido (todos os STLs)" : "Dados do componente"}
                </p>
                <div className="flex justify-between">
                  <span className="text-slate-400">Peso total de filamento</span>
                  <span className="font-bold text-white">{pesoTotal != null ? `${pesoTotal.toLocaleString("pt-BR")} g` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Custo de matéria prima</span>
                  <span className="font-bold text-cyan-300">{custoMat != null ? brl(custoMat) : "—"}</span>
                </div>
                {custoMat == null && (
                  <p className="text-xs text-amber-400">⚠ Filamentos ou custos não cadastrados para este componente.</p>
                )}
              </div>
            )}

            <h3 className="pt-2 text-xs font-bold uppercase tracking-widest text-slate-400">Parâmetros de impressão</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-400">Tempo de impressão (h) *</label>
                <input type="number" min="0" step="0.01"
                  value={params.tempo_horas || ""}
                  onChange={(e) => setParams((p) => ({ ...p, tempo_horas: Number(e.target.value) || 0 }))}
                  className={FIELD_SM} placeholder="Ex.: 2.5" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-400">Quantidade no pedido</label>
                <input type="number" min="1" step="1"
                  value={params.qtd_pedido}
                  onChange={(e) => setParams((p) => ({ ...p, qtd_pedido: Number(e.target.value) || 1 }))}
                  className={FIELD_SM} placeholder="1" />
              </div>
            </div>

            <h3 className="pt-2 text-xs font-bold uppercase tracking-widest text-slate-400">Parâmetros da máquina</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-400">Custo kWh (R$)</label>
                <input type="number" min="0" step="0.01"
                  value={params.custo_kwh}
                  onChange={(e) => setParams((p) => ({ ...p, custo_kwh: Number(e.target.value) || 0 }))}
                  className={FIELD_SM} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-400">Potência máquina (W)</label>
                <input type="number" min="0" step="10"
                  value={params.kw_maquina}
                  onChange={(e) => setParams((p) => ({ ...p, kw_maquina: Number(e.target.value) || 0 }))}
                  className={FIELD_SM} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-400">Desgaste máq. (R$/h)</label>
                <input type="number" min="0" step="0.10"
                  value={params.desgaste_hora}
                  onChange={(e) => setParams((p) => ({ ...p, desgaste_hora: Number(e.target.value) || 0 }))}
                  className={FIELD_SM} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-400">Custo elétrico/h</label>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-violet-300">
                  {brl((params.kw_maquina / 1000) * params.custo_kwh)}/h
                </div>
              </div>
            </div>
          </div>

          {/* Coluna direita — tabela de faixas */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Tabela de preços</h3>

            {faixas.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                {!idComp && !idPedido
                  ? "Selecione um componente STL ou um pedido para calcular."
                  : custoMat == null
                  ? "Cadastre os filamentos e custos do componente."
                  : "Informe o tempo de impressão (horas) para calcular."}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04] text-left text-[10px] uppercase tracking-widest text-slate-500">
                      <th className="px-3 py-2">Faixa</th>
                      <th className="px-3 py-2">Mult</th>
                      <th className="px-3 py-2">Preço unit.</th>
                      <th className="px-3 py-2">Custo unit.</th>
                      <th className="px-3 py-2">Lucro liq.</th>
                      <th className="px-3 py-2">Vr total</th>
                      <th className="px-3 py-2">Salvar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {faixas.map((f) => {
                      const isEscolhida = faixaEscolhida?.label === f.label;
                      return (
                        <tr key={f.label}
                          className={`transition-colors ${isEscolhida ? "bg-cyan-400/10" : "hover:bg-white/[0.03]"}`}>
                          <td className="px-3 py-2.5 font-bold text-white">{f.label}</td>
                          <td className="px-3 py-2.5 text-slate-400">{f.mult}x</td>
                          <td className="px-3 py-2.5 font-bold text-emerald-300">{brl(f.preco_unit)}</td>
                          <td className="px-3 py-2.5 text-slate-400">{brl(f.custo_unit)}</td>
                          <td className="px-3 py-2.5 text-amber-300">{brl(f.lucro_liq)}</td>
                          <td className="px-3 py-2.5 text-violet-300">{brl(f.vr_total)}</td>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => salvarCotacao(f)}
                              disabled={salvando}
                              className="rounded-lg bg-cyan-400/20 px-2 py-1 text-[10px] font-black text-cyan-300 hover:bg-cyan-400/30 disabled:opacity-50"
                            >
                              {salvando && isEscolhida ? "..." : "Usar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Resumo dos custos */}
                <div className="border-t border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Custo matéria prima</span>
                    <span className="text-slate-300">{custoMat != null ? brl(custoMat) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custo elétrico ({params.tempo_horas}h)</span>
                    <span className="text-slate-300">{brl((params.kw_maquina / 1000) * params.custo_kwh * params.tempo_horas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desgaste máquina</span>
                    <span className="text-slate-300">{brl(params.desgaste_hora * params.tempo_horas)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-1 font-bold">
                    <span className="text-white">Custo total unitário</span>
                    <span className="text-cyan-300">{faixas.length > 0 ? brl(faixas[0].custo_unit) : "—"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ── HISTÓRICO DE COTAÇÕES ─────────────────────────────── */}
      <GlassCard>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Histórico de cotações</h2>
            <p className="mt-1 text-sm text-slate-400">Cotações salvas anteriormente.</p>
          </div>
          <button type="button" onClick={reload}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
            Atualizar
          </button>
        </div>

        <LoadingOrEmpty loading={loading} empty={data.length === 0}
          loadingText="Carregando cotações..." emptyText="Nenhuma cotação salva ainda.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-separate border-spacing-y-1 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-2">Componente</th>
                  <th className="px-4 py-2">Impressora</th>
                  <th className="px-4 py-2">Custo unit.</th>
                  <th className="px-4 py-2">Valor venda</th>
                  <th className="px-4 py-2">Lucro total</th>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={String(row.id_componente_stl ?? row.id_pedido ?? i)} className="bg-white/[0.035] text-slate-200">
                    <td className="rounded-l-2xl px-4 py-3 font-bold text-white">
                      {row.id_pedido
                        ? <span className="text-violet-300">📦 {(options?.pedidos||[]).find(p=>Number(p.id_pedido)===Number(row.id_pedido)) ? String((options?.pedidos||[]).find(p=>Number(p.id_pedido)===Number(row.id_pedido))?.label_pedido ?? `Pedido ${row.id_pedido}`) : `Pedido ${row.id_pedido}`}</span>
                        : nomeComp(row.id_componente_stl ?? "")}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {row.id_impressora ? nomeImp(row.id_impressora) : "—"}
                    </td>
                    <td className="px-4 py-3">{row.custo_geral != null ? brl(Number(row.custo_geral)) : "—"}</td>
                    <td className="px-4 py-3 font-bold text-emerald-300">{row.valor_venda != null ? brl(Number(row.valor_venda)) : "—"}</td>
                    <td className="px-4 py-3 text-amber-300">{row.lucro_geral != null ? brl(Number(row.lucro_geral)) : "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {row.dia_cot && row.mes_cot && row.ano_cot
                        ? `${String(row.dia_cot).padStart(2,"0")}/${String(row.mes_cot).padStart(2,"0")}/${row.ano_cot}`
                        : "—"}
                    </td>
                    <td className="rounded-r-2xl px-4 py-3">
                      <ActionButtons
                        onEdit={() => {}}
                        onDelete={() => handleDelete(String(row.id_componente_stl ?? ""))}
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
