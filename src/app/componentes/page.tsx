"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Filter, Plus, Trash2, X } from "lucide-react";
import {
  ActionButtons,
  Feedback,
  getJson,
  LoadingOrEmpty,
  NumberOrBlank,
  PageShell,
  useAuthGuard,
  useCrudList,
} from "../_shared";

type Registro = Record<string, any>;

type Fabricante = {
  id_fabricante_filamento: number;
  nome_fabricante: string;
  ativo?: boolean;
};

type CompImpressora = {
  id_comp_imp?: number;
  id_componente_stl?: number;
  id_impressora: number;
  tempo_impressao_min: number;
};

type OptionsData = {
  filamentos?: Registro[];
  impressoras?: Registro[];
  compImpressoras?: Registro[];
};

type CampoFilamento = {
  idx: number;
  idFilamento: string;
  setIdFilamento: (value: string) => void;
  gramas: string;
  setGramas: (value: string) => void;
};

function texto(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

// Extrai o nome do fabricante do objeto filamento.
// A API /api/options resolve o fabricante e injeta como campo flat: item.nome_fabricante
function nomeFabricante(item: Registro | undefined): string {
  if (!item) return "";
  return texto(item.nome_fabricante);
}

function montarLabelFilamento(item: Registro | undefined) {
  if (!item) return "";
  const nome       = texto(item.nome_filamento);
  const material   = texto(item.material_filamento);
  const fabricante = nomeFabricante(item);
  const cor        = texto(item.cor_filamento);
  const partes = [nome, material, fabricante, cor].filter(Boolean);
  if (partes.length === 0) {
    return `Filamento ${texto(item.id_filamento) || "sem identificação"}`;
  }
  return partes.join(" • ");
}

// ── FiltroColuna ────────────────────────────────────────────────────────────
function FiltroColuna({
  label, opcoes, selecionados, onChange,
}: {
  label: string; opcoes: string[]; selecionados: string[];
  onChange: (novo: string[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  function abrir() {
    setRascunho(selecionados.length === 0 ? [...opcoes] : [...selecionados]);
    setAberto(true);
  }
  function fechar() { setAberto(false); }
  function aplicar() {
    onChange(rascunho.length === opcoes.length ? [] : [...rascunho]);
    fechar();
  }
  function toggle(valor: string) {
    setRascunho((prev) => {
      if (prev.length === opcoes.length) return [valor];
      const jaEsta = prev.includes(valor);
      const novo = jaEsta ? prev.filter((v) => v !== valor) : [...prev, valor];
      return novo.length === opcoes.length ? [...opcoes] : novo;
    });
  }

  useEffect(() => {
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  const ativo = selecionados.length > 0 && selecionados.length < opcoes.length;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={aberto ? aplicar : abrir}
        className={`flex w-full items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${
          ativo
            ? "border border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
            : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
        }`}>
        <span className="flex items-center gap-1 truncate">
          {ativo && <Filter className="h-3 w-3 shrink-0" />}
          {label}
          {ativo && (
            <span className="ml-1 rounded-full bg-cyan-400 px-1.5 text-[10px] font-black text-slate-950">
              {selecionados.length}
            </span>
          )}
        </span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-2xl border border-white/15 bg-slate-900 shadow-2xl shadow-black/50">
          <div className="flex gap-1 border-b border-white/10 px-2 py-1.5">
            <button type="button" onClick={() => setRascunho([...opcoes])}
              className="flex-1 rounded-lg bg-white/5 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-white/10">Todos</button>
            <button type="button" onClick={() => setRascunho([])}
              className="flex-1 rounded-lg bg-white/5 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-white/10">Nenhum</button>
            <button type="button" onClick={aplicar}
              className="flex-1 rounded-lg bg-cyan-400/20 px-2 py-1 text-xs font-black text-cyan-300 hover:bg-cyan-400/30">OK</button>
          </div>
          <ul className="max-h-48 overflow-y-auto p-1">
            {opcoes.map((opcao) => (
              <li key={opcao}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-200 hover:bg-white/10">
                  <input type="checkbox" checked={rascunho.includes(opcao)} onChange={() => toggle(opcao)}
                    className="h-3.5 w-3.5 accent-cyan-400" />
                  <span className="truncate">{opcao || "(vazio)"}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/componentes");

  const [options,     setOptions]     = useState<OptionsData | null>(null);
  const [salvando,    setSalvando]    = useState(false);
  const [mensagem,    setMensagem]    = useState("");
  const [editingId,   setEditingId]   = useState<string | null>(null);

  const [nome_componente, setNomeComponente] = useState("");

  // Cascata: nomes_sel → mats_sel → fabs_sel → id_filamentoN
  const [nomes_sel, setNomesSel] = useState<string[]>(Array(8).fill(""));
  const [mats_sel,  setMatsSel]  = useState<string[]>(Array(8).fill(""));
  const [fabs_sel,  setFabsSel]  = useState<string[]>(Array(8).fill(""));

  const [id_filamento1, setIdFilamento1] = useState("");
  const [id_filamento2, setIdFilamento2] = useState("");
  const [id_filamento3, setIdFilamento3] = useState("");
  const [id_filamento4, setIdFilamento4] = useState("");
  const [id_filamento5, setIdFilamento5] = useState("");
  const [id_filamento6, setIdFilamento6] = useState("");
  const [id_filamento7, setIdFilamento7] = useState("");
  const [id_filamento8, setIdFilamento8] = useState("");

  const idSetters = [
    setIdFilamento1, setIdFilamento2, setIdFilamento3, setIdFilamento4,
    setIdFilamento5, setIdFilamento6, setIdFilamento7, setIdFilamento8,
  ];

  const [gramas_filamento_1, setGramas1] = useState("");
  const [gramas_filamento_2, setGramas2] = useState("");
  const [gramas_filamento_3, setGramas3] = useState("");
  const [gramas_filamento_4, setGramas4] = useState("");
  const [gramas_filamento_5, setGramas5] = useState("");
  const [gramas_filamento_6, setGramas6] = useState("");
  const [gramas_filamento_7, setGramas7] = useState("");
  const [gramas_filamento_8, setGramas8] = useState("");

  const [tempo_impressao_min, setTempoImpressaoMin] = useState("");
  const [compImps, setCompImps] = useState<CompImpressora[]>([]);

  // ── Filtros da lista ───────────────────────────────────────────────────────
  const [filtroNome,       setFiltroNome]       = useState<string[]>([]);
  const [filtroFilamento,  setFiltroFilamento]  = useState<string[]>([]);
  const [filtroMaterial,   setFiltroMaterial]   = useState<string[]>([]);
  const [filtroFabricante, setFiltroFabricante] = useState<string[]>([]);
  const [filtroCor,        setFiltroCor]        = useState<string[]>([]);

  // ── Carregamento ───────────────────────────────────────────────────────────
  useEffect(() => {
    getJson<OptionsData>("/api/options")
      .then((r) => setOptions(r[0] || null))
      .catch(() => {});
  }, []);

  const filamentosDisponiveis = useMemo(() => options?.filamentos || [], [options]);

  const filamentoPorId = useMemo(() => {
    const mapa = new Map<string, Registro>();
    for (const item of filamentosDisponiveis) {
      mapa.set(String(item.id_filamento ?? ""), item);
    }
    return mapa;
  }, [filamentosDisponiveis]);

  // ── Helpers — todos usam a estrutura real do objeto ────────────────────────
  function getItem(id: unknown): Registro | undefined {
    return filamentoPorId.get(texto(id));
  }
  function labelFilamentoPorId(id: unknown)     { return montarLabelFilamento(getItem(id)); }
  function nomeFilamentoPorId(id: unknown)       { return texto(getItem(id)?.nome_filamento); }
  function materialFilamentoPorId(id: unknown)   { return texto(getItem(id)?.material_filamento); }
  function fabricanteFilamentoPorId(id: unknown) { return nomeFabricante(getItem(id)); }
  function corFilamentoPorId(id: unknown)        { return texto(getItem(id)?.cor_filamento); }

  // ── Cascata ────────────────────────────────────────────────────────────────
  function setNomeSel(idx: number, val: string) {
    setNomesSel((p) => p.map((v, i) => i === idx ? val : v));
    setMatsSel((p)  => p.map((v, i) => i === idx ? ""  : v));
    setFabsSel((p)  => p.map((v, i) => i === idx ? ""  : v));
    idSetters[idx]("");
  }
  function setMatSel(idx: number, val: string) {
    setMatsSel((p) => p.map((v, i) => i === idx ? val : v));
    setFabsSel((p)  => p.map((v, i) => i === idx ? ""  : v));
    idSetters[idx]("");
  }
  function setFabSel(idx: number, val: string) {
    setFabsSel((p) => p.map((v, i) => i === idx ? val : v));
    idSetters[idx]("");
  }

  // ── Form reset / fill ──────────────────────────────────────────────────────
  function resetForm() {
    setEditingId(null);
    setNomeComponente("");
    idSetters.forEach((s) => s(""));
    setGramas1(""); setGramas2(""); setGramas3(""); setGramas4("");
    setGramas5(""); setGramas6(""); setGramas7(""); setGramas8("");
    setTempoImpressaoMin("");
    setCompImps([]);
    setNomesSel(Array(8).fill(""));
    setMatsSel(Array(8).fill(""));
    setFabsSel(Array(8).fill(""));
  }

  function fillForEdit(row: Registro) {
    setEditingId(String(row.id_componente_stl ?? ""));
    setNomeComponente(String(row.nome_componente ?? ""));

    const ids = [1,2,3,4,5,6,7,8].map((n) => row[`id_filamento${n}`]);
    const novosNomes: string[] = Array(8).fill("");
    const novosMats:  string[] = Array(8).fill("");
    const novosFabs:  string[] = Array(8).fill("");

    ids.forEach((id, i) => {
      const val = String(id ?? "");
      idSetters[i](val);
      if (val) {
        const item = filamentoPorId.get(val);
        if (item) {
          novosNomes[i] = texto(item.nome_filamento);
          novosMats[i]  = texto(item.material_filamento);
          novosFabs[i]  = nomeFabricante(item);
        }
      }
    });
    setNomesSel(novosNomes);
    setMatsSel(novosMats);
    setFabsSel(novosFabs);

    setGramas1(String(row.gramas_filamento_1 ?? ""));
    setGramas2(String(row.gramas_filamento_2 ?? ""));
    setGramas3(String(row.gramas_filamento_3 ?? ""));
    setGramas4(String(row.gramas_filamento_4 ?? ""));
    setGramas5(String(row.gramas_filamento_5 ?? ""));
    setGramas6(String(row.gramas_filamento_6 ?? ""));
    setGramas7(String(row.gramas_filamento_7 ?? ""));
    setGramas8(String(row.gramas_filamento_8 ?? ""));
    setTempoImpressaoMin(String(row.tempo_impressao_min ?? ""));

    const idComp = Number(row.id_componente_stl);
    const cis = (options?.compImpressoras || [])
      .filter((ci) => Number(ci.id_componente_stl) === idComp)
      .map((ci) => ({ id_impressora: Number(ci.id_impressora), tempo_impressao_min: Number(ci.tempo_impressao_min) }));
    setCompImps(cis);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este componente?")) return;
    try {
      setErro("");
      const r = await fetch("/api/componentes?id=" + id, { method: "DELETE" });
      const res = await r.json();
      if (!r.ok || !res.ok) throw new Error(res.error || "Erro ao excluir.");
      setMensagem("Componente excluído com sucesso.");
      if (editingId === id) resetForm();
      reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      setSalvando(true); setErro(""); setMensagem("");
      const ids    = [id_filamento1,id_filamento2,id_filamento3,id_filamento4,
                      id_filamento5,id_filamento6,id_filamento7,id_filamento8];
      const gramas = [gramas_filamento_1,gramas_filamento_2,gramas_filamento_3,gramas_filamento_4,
                      gramas_filamento_5,gramas_filamento_6,gramas_filamento_7,gramas_filamento_8];
      const payload: Record<string, unknown> = {
        nome_componente,
        tempo_impressao_min: NumberOrBlank(tempo_impressao_min),
        comp_impressoras: compImps.filter((ci) => ci.id_impressora > 0),
      };
      ids.forEach((id, i)   => { payload[`id_filamento${i + 1}`]      = id ? Number(id) : null; });
      gramas.forEach((g, i) => { payload[`gramas_filamento_${i + 1}`] = NumberOrBlank(g); });
      const method = editingId ? "PUT" : "POST";
      if (editingId) payload.id_componente_stl = Number(editingId);
      const r = await fetch("/api/componentes", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const res = await r.json();
      if (!r.ok || !res.ok) throw new Error(res.error || "Erro ao salvar.");
      setMensagem(editingId ? "Componente atualizado." : "Componente salvo.");
      resetForm(); reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  // ── Enriquecer dados para filtros ──────────────────────────────────────────
  const todasAsLinhas = useMemo(() => {
    return data.map((row) => {
      const filamentosUsados = [1,2,3,4,5,6,7,8]
        .map((n) => row[`id_filamento${n}`])
        .filter((id) => id != null && String(id) !== "" && String(id) !== "0")
        .map((id) => ({
          label:      labelFilamentoPorId(id),
          nome:       nomeFilamentoPorId(id),
          material:   materialFilamentoPorId(id),
          fabricante: fabricanteFilamentoPorId(id),
          cor:        corFilamentoPorId(id),
        }));
      return {
        row,
        nomeComp:             String(row.nome_componente ?? ""),
        filamentos:           filamentosUsados,
        nomesFilamento:       [...new Set(filamentosUsados.map((f) => f.nome).filter(Boolean))],
        materiaisFilamento:   [...new Set(filamentosUsados.map((f) => f.material).filter(Boolean))],
        fabricantesFilamento: [...new Set(filamentosUsados.map((f) => f.fabricante).filter(Boolean))],
        coresFilamento:       [...new Set(filamentosUsados.map((f) => f.cor).filter(Boolean))],
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filamentoPorId]);

  const opcoesNome       = [...new Set(todasAsLinhas.map((r) => r.nomeComp))].sort();
  const opcoesFilamento  = [...new Set(todasAsLinhas.flatMap((r) => r.nomesFilamento))].sort();
  const opcoesMaterial   = [...new Set(todasAsLinhas.flatMap((r) => r.materiaisFilamento))].sort();
  const opcoesFabricante = [...new Set(todasAsLinhas.flatMap((r) => r.fabricantesFilamento))].sort();
  const opcoesCor        = [...new Set(todasAsLinhas.flatMap((r) => r.coresFilamento))].sort();

  const nomeSet       = new Set(filtroNome);
  const filamentoSet  = new Set(filtroFilamento);
  const materialSet   = new Set(filtroMaterial);
  const fabricanteSet = new Set(filtroFabricante);
  const corSet        = new Set(filtroCor);

  const dadosFiltrados = todasAsLinhas.filter((r) => {
    if (nomeSet.size       > 0 && !nomeSet.has(r.nomeComp)) return false;
    if (filamentoSet.size  > 0 && !r.nomesFilamento.some((n) => filamentoSet.has(n))) return false;
    if (materialSet.size   > 0 && !r.materiaisFilamento.some((m) => materialSet.has(m))) return false;
    if (fabricanteSet.size > 0 && !r.fabricantesFilamento.some((f) => fabricanteSet.has(f))) return false;
    if (corSet.size        > 0 && !r.coresFilamento.some((c) => corSet.has(c))) return false;
    return true;
  });

  const filtroKey = [
    filtroNome.join("|"), filtroFilamento.join("|"), filtroMaterial.join("|"),
    filtroFabricante.join("|"), filtroCor.join("|"),
  ].join("__");

  const algumFiltroAtivo =
    filtroNome.length > 0 || filtroFilamento.length > 0 || filtroMaterial.length > 0 ||
    filtroFabricante.length > 0 || filtroCor.length > 0;

  function limparTodosFiltros() {
    setFiltroNome([]); setFiltroFilamento([]); setFiltroMaterial([]);
    setFiltroFabricante([]); setFiltroCor([]);
  }

  if (!ready) return <main className="min-h-screen p-8 text-slate-100">Carregando...</main>;

  const camposFilamento: CampoFilamento[] = [
    { idx:1, idFilamento:id_filamento1, setIdFilamento:setIdFilamento1, gramas:gramas_filamento_1, setGramas:setGramas1 },
    { idx:2, idFilamento:id_filamento2, setIdFilamento:setIdFilamento2, gramas:gramas_filamento_2, setGramas:setGramas2 },
    { idx:3, idFilamento:id_filamento3, setIdFilamento:setIdFilamento3, gramas:gramas_filamento_3, setGramas:setGramas3 },
    { idx:4, idFilamento:id_filamento4, setIdFilamento:setIdFilamento4, gramas:gramas_filamento_4, setGramas:setGramas4 },
    { idx:5, idFilamento:id_filamento5, setIdFilamento:setIdFilamento5, gramas:gramas_filamento_5, setGramas:setGramas5 },
    { idx:6, idFilamento:id_filamento6, setIdFilamento:setIdFilamento6, gramas:gramas_filamento_6, setGramas:setGramas6 },
    { idx:7, idFilamento:id_filamento7, setIdFilamento:setIdFilamento7, gramas:gramas_filamento_7, setGramas:setGramas7 },
    { idx:8, idFilamento:id_filamento8, setIdFilamento:setIdFilamento8, gramas:gramas_filamento_8, setGramas:setGramas8 },
  ];

  return (
    <PageShell title="Componentes" description="Cadastro técnico de componentes STL e itens fabricáveis.">
      <Feedback erro={erro} mensagem={mensagem} />

      {/* ── FORMULÁRIO ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-white">
            {editingId ? "Editar componente" : "Novo componente"}
          </h2>
          {editingId && (
            <button type="button" onClick={resetForm}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
              Cancelar edição
            </button>
          )}
        </div>

        <div className="mb-4 max-w-md">
          <label className="mb-2 block text-sm font-bold text-slate-300">Nome do componente *</label>
          <input required value={nome_componente} onChange={(e) => setNomeComponente(e.target.value)}
            placeholder="Ex.: CAIXA NIVEL 1.STL"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400" />
        </div>

        {/* Filamentos — cascata Nome → Material → Fabricante → Cor */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {camposFilamento.map((campo) => {
            const nomeSel = nomes_sel[campo.idx - 1];
            const matSel  = mats_sel[campo.idx - 1];
            const fabSel  = fabs_sel[campo.idx - 1];

            // 1. Nomes únicos
            const nomes = [...new Set(
              filamentosDisponiveis.map((f) => texto(f.nome_filamento))
            )].filter(Boolean).sort();

            // 2. Materiais filtrados pelo nome
            const materiais = [...new Set(
              filamentosDisponiveis
                .filter((f) => texto(f.nome_filamento) === nomeSel)
                .map((f) => texto(f.material_filamento))
            )].filter(Boolean).sort();

            // 3. Fabricantes filtrados por nome + material
            //    Usa item.fabricante?.nome_fabricante — mesma fonte do módulo de filamentos
            const fabricantesOpcoes = [...new Set(
              filamentosDisponiveis
                .filter((f) =>
                  texto(f.nome_filamento)    === nomeSel &&
                  texto(f.material_filamento) === matSel
                )
                .map((f) => nomeFabricante(f))
            )].filter(Boolean).sort();

            // 4. Cores filtradas por nome + material + fabricante
            const cores = filamentosDisponiveis.filter((f) =>
              texto(f.nome_filamento)    === nomeSel &&
              texto(f.material_filamento) === matSel  &&
              nomeFabricante(f)           === fabSel
            );

            return (
              <div key={campo.idx} className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">
                  Filamento {campo.idx}
                </p>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Nome</span>
                  <select value={nomeSel} onChange={(e) => setNomeSel(campo.idx - 1, e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400">
                    <option value="">Selecione o nome</option>
                    {nomes.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>

                {nomeSel && (
                  <label className="mt-2 block">
                    <span className="mb-1 block text-xs font-semibold text-slate-400">Material</span>
                    <select value={matSel} onChange={(e) => setMatSel(campo.idx - 1, e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400">
                      <option value="">Selecione o material</option>
                      {materiais.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                )}

                {nomeSel && matSel && (
                  <label className="mt-2 block">
                    <span className="mb-1 block text-xs font-semibold text-slate-400">Fabricante</span>
                    <select value={fabSel} onChange={(e) => setFabSel(campo.idx - 1, e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400">
                      <option value="">Selecione o fabricante</option>
                      {fabricantesOpcoes.map((fb) => <option key={fb} value={fb}>{fb}</option>)}
                    </select>
                  </label>
                )}

                {nomeSel && matSel && fabSel && (
                  <label className="mt-2 block">
                    <span className="mb-1 block text-xs font-semibold text-slate-400">Cor</span>
                    <select value={campo.idFilamento} onChange={(e) => campo.setIdFilamento(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400">
                      <option value="">Selecione a cor</option>
                      {cores.map((item) => (
                        <option key={String(item.id_filamento)} value={String(item.id_filamento)}>
                          {texto(item.cor_filamento) || "Sem cor"}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Gramas</span>
                  <input value={campo.gramas} onChange={(e) => campo.setGramas(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    placeholder={`Gramas Filamento ${campo.idx}`} />
                </label>
              </div>
            );
          })}
        </div>

        {/* Tempo padrão */}
        <div className="mt-4 max-w-xs">
          <label className="mb-2 block text-sm font-bold text-slate-300">Tempo padrão de impressão (min)</label>
          <input type="number" min="0" value={tempo_impressao_min}
            onChange={(e) => setTempoImpressaoMin(e.target.value)} placeholder="Ex.: 51"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400" />
          <p className="mt-1 text-xs text-slate-500">Usado quando não há impressora específica cadastrada</p>
        </div>

        {/* Tempos por impressora */}
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-bold text-slate-300">Tempo por impressora</label>
            <button type="button"
              onClick={() => setCompImps((prev) => [...prev, { id_impressora: 0, tempo_impressao_min: 0 }])}
              className="flex items-center gap-1 rounded-xl border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-xs font-bold text-violet-300 hover:bg-violet-400/20">
              <Plus className="h-3.5 w-3.5" /> Adicionar impressora
            </button>
          </div>
          {compImps.length === 0 && (
            <p className="text-xs text-slate-500">Nenhuma impressora específica. Será usado o tempo padrão acima.</p>
          )}
          <div className="space-y-2">
            {compImps.map((ci, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select value={ci.id_impressora || ""}
                  onChange={(e) => setCompImps((prev) => prev.map((x, i) => i === idx ? { ...x, id_impressora: Number(e.target.value) } : x))}
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none focus:border-violet-400">
                  <option value="">Selecione a impressora</option>
                  {(options?.impressoras || []).map((imp) => (
                    <option key={String(imp.id_impressora)} value={String(imp.id_impressora)}>
                      {String(imp.nome_impressora ?? imp.nome ?? imp.id_impressora)}
                    </option>
                  ))}
                </select>
                <input type="number" min="0" value={ci.tempo_impressao_min || ""}
                  onChange={(e) => setCompImps((prev) => prev.map((x, i) => i === idx ? { ...x, tempo_impressao_min: Number(e.target.value) } : x))}
                  placeholder="min"
                  className="w-24 shrink-0 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none focus:border-violet-400" />
                <button type="button" onClick={() => setCompImps((prev) => prev.filter((_, i) => i !== idx))}
                  className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button disabled={salvando}
            className="rounded-2xl bg-cyan-400 px-5 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
            {salvando ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* ── LISTA ────────────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Lista</h2>
            <p className="mt-1 text-sm text-slate-400">
              {algumFiltroAtivo && (
                <span className="text-cyan-400">
                  {dadosFiltrados.length} de {data.length} componentes visíveis
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {algumFiltroAtivo && (
              <button onClick={limparTodosFiltros}
                className="flex items-center gap-1 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20">
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
            <button type="button" onClick={reload}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
              Atualizar
            </button>
          </div>
        </div>

        <LoadingOrEmpty loading={loading} empty={data.length === 0}
          loadingText="Carregando componentes..." emptyText="Nenhum componente cadastrado.">

          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
            <FiltroColuna label="Componente"  opcoes={opcoesNome}       selecionados={filtroNome}       onChange={setFiltroNome} />
            <FiltroColuna label="Filamento"   opcoes={opcoesFilamento}  selecionados={filtroFilamento}  onChange={setFiltroFilamento} />
            <FiltroColuna label="Material"    opcoes={opcoesMaterial}   selecionados={filtroMaterial}   onChange={setFiltroMaterial} />
            <FiltroColuna label="Fabricante"  opcoes={opcoesFabricante} selecionados={filtroFabricante} onChange={setFiltroFabricante} />
            <FiltroColuna label="Cor"         opcoes={opcoesCor}        selecionados={filtroCor}        onChange={setFiltroCor} />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">Nome</th>
                  <th className="px-3 py-3">Filamentos utilizados</th>
                  <th className="px-3 py-3">Tempo (min)</th>
                  <th className="px-3 py-3">Ações</th>
                </tr>
              </thead>
              <tbody key={filtroKey}>
                {dadosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                      Nenhum componente corresponde aos filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  dadosFiltrados.map(({ row, filamentos: fils }) => (
                    <tr key={String(row.id_componente_stl)} className="border-b border-white/5 text-slate-200">
                      <td className="px-3 py-3 text-slate-400">{row.id_componente_stl ?? ""}</td>
                      <td className="px-3 py-3 font-semibold text-white">{row.nome_componente ?? ""}</td>
                      <td className="px-3 py-3">
                        {fils.length === 0 ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {fils.map((f, i) => {
                              const g = row[`gramas_filamento_${i + 1}`];
                              return (
                                <span key={i} className="flex items-center gap-1.5">
                                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-[9px] font-black text-cyan-400">
                                    {i + 1}
                                  </span>
                                  <span className="text-slate-200">{f.label}</span>
                                  {g != null && String(g) !== "" && String(g) !== "0" && (
                                    <span className="ml-1 text-xs text-slate-500">{g}g</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-cyan-300">
                        {row.tempo_impressao_min ? `${row.tempo_impressao_min} min` : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <ActionButtons
                          onEdit={() => fillForEdit(row)}
                          onDelete={() => handleDelete(String(row.id_componente_stl ?? ""))}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </LoadingOrEmpty>
      </section>
    </PageShell>
  );
}
