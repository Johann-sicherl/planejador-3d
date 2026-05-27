"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
import { ChevronDown, Filter, X } from "lucide-react";

type Fabricante = {
  id_fabricante_filamento: number;
  nome_fabricante: string;
  ativo?: boolean;
};

type Registro = {
  id_filamento?: number;
  nome_filamento?: string | null;
  material_filamento?: string | null;
  id_fabricante_filamento?: number | null;
  cor_filamento?: string | null;
  custo_medio_brl?: number | null;
  textura_filamento?: string | null;
  tipo_carretel?: string | null;
  fabricante?: { id_fabricante_filamento: number; nome_fabricante: string } | null;
};

const MATERIAIS_FILAMENTO = [
  "PLA","PLA+","PLA Silk","PLA Matte","PLA Wood","PLA Carbon Fiber",
  "PETG","PETG Carbon Fiber","ABS","ABS+","ASA","ASA Carbon Fiber",
  "PP","PC","PC-ABS","PA","PA6","PA12","Nylon","Nylon Carbon Fiber",
  "TPU","TPE","PVA","HIPS","PMMA","POM","PEEK","PEI","PPS","PPS-CF",
  "PVDF","Metal Filled","Outro",
];

const TEXTURAS_FILAMENTO = [
  "Liso","Silk / Brilhante","Fosco / Matte","Madeira","Marmorizado",
  "Glitter","Fluorescente","Transparente","Outro",
];

const TIPOS_CARRETEL = ["1kg","2kg","500g","250g","Granel","Outro"];

const FIELD_CLASS =
  "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400";

// ── FiltroColuna — idêntico ao do estoque ────────────────────────────────────
function FiltroColuna({
  label,
  opcoes,
  selecionados,
  onChange,
}: {
  label: string;
  opcoes: string[];
  selecionados: string[];
  onChange: (novo: string[]) => void;
}) {
  const [aberto,   setAberto]   = useState(false);
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

  useEffect(() => {
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  function toggleRascunho(valor: string) {
    setRascunho((prev) => {
      if (prev.length === opcoes.length) return [valor];
      const jaEsta = prev.includes(valor);
      const novo = jaEsta ? prev.filter((v) => v !== valor) : [...prev, valor];
      return novo.length === opcoes.length ? [...opcoes] : novo;
    });
  }

  const ativo = selecionados.length > 0 && selecionados.length < opcoes.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={aberto ? fechar : abrir}
        className={`flex w-full items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${
          ativo
            ? "border border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
            : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
        }`}
      >
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
              className="flex-1 rounded-lg bg-white/5 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-white/10">
              Todos
            </button>
            <button type="button" onClick={() => setRascunho([])}
              className="flex-1 rounded-lg bg-white/5 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-white/10">
              Nenhum
            </button>
            <button type="button" onClick={aplicar}
              className="flex-1 rounded-lg bg-cyan-400/20 px-2 py-1 text-xs font-black text-cyan-300 hover:bg-cyan-400/30">
              OK
            </button>
          </div>
          <ul className="max-h-48 overflow-y-auto p-1">
            {opcoes.map((opcao) => (
              <li key={opcao}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-200 hover:bg-white/10">
                  <input
                    type="checkbox"
                    checked={rascunho.includes(opcao)}
                    onChange={() => toggleRascunho(opcao)}
                    className="h-3.5 w-3.5 accent-cyan-400"
                  />
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

// ── Página principal ─────────────────────────────────────────────────────────
export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/filamentos");

  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nomeFilamento, setNomeFilamento] = useState("");
  const [materialFilamento, setMaterialFilamento] = useState("");
  const [idFabricanteFilamento, setIdFabricanteFilamento] = useState("");
  const [corFilamento, setCorFilamento] = useState("");
  const [custoMedioBrl, setCustoMedioBrl] = useState("");
  const [texturaFilamento, setTexturaFilamento] = useState("");
  const [tipoCarretel, setTipoCarretel] = useState("");

  // Filtros
  const [filtroNome,      setFiltroNome]      = useState<string[]>([]);
  const [filtroMaterial,  setFiltroMaterial]  = useState<string[]>([]);
  const [filtroCor,       setFiltroCor]       = useState<string[]>([]);
  const [filtroCarretel,  setFiltroCarretel]  = useState<string[]>([]);
  const [filtroFornecedor,setFiltroFornecedor]= useState<string[]>([]);

  useEffect(() => { carregarFabricantes(); }, []);

  async function carregarFabricantes() {
    try {
      const response = await fetch("/api/fabricantes-filamentos", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Erro ao carregar fabricantes.");
      setFabricantes(result.data || []);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar fabricantes.");
    }
  }

  function resetForm() {
    setEditingId(null);
    setNomeFilamento(""); setMaterialFilamento(""); setIdFabricanteFilamento("");
    setCorFilamento(""); setCustoMedioBrl(""); setTexturaFilamento(""); setTipoCarretel("");
  }

  function fillForEdit(row: Registro) {
    setEditingId(String(row.id_filamento ?? ""));
    setNomeFilamento(String(row.nome_filamento ?? ""));
    setMaterialFilamento(String(row.material_filamento ?? ""));
    setIdFabricanteFilamento(String(row.id_fabricante_filamento ?? ""));
    setCorFilamento(String(row.cor_filamento ?? ""));
    setCustoMedioBrl(String(row.custo_medio_brl ?? ""));
    setTexturaFilamento(String(row.textura_filamento ?? ""));
    setTipoCarretel(String(row.tipo_carretel ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este filamento?")) return;
    try {
      setErro(""); setMensagem("");
      const response = await fetch("/api/filamentos?id=" + id, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Erro ao excluir.");
      setMensagem("Filamento excluido com sucesso.");
      if (editingId === id) resetForm();
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      setSalvando(true); setErro(""); setMensagem("");
      const payload: Record<string, string | number | null> = {
        nome_filamento: nomeFilamento || null,
        material_filamento: materialFilamento || null,
        id_fabricante_filamento: NumberOrBlank(idFabricanteFilamento),
        cor_filamento: corFilamento || null,
        custo_medio_brl: NumberOrBlank(custoMedioBrl),
        textura_filamento: texturaFilamento || null,
        tipo_carretel: tipoCarretel || null,
      };
      const method = editingId ? "PUT" : "POST";
      if (editingId) payload.id_filamento = Number(editingId);
      const response = await fetch("/api/filamentos", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Erro ao salvar.");
      setMensagem(editingId ? "Filamento atualizado com sucesso." : "Filamento salvo com sucesso.");
      resetForm(); await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  // Sets derivados dos filtros ativos
  const nomeSet      = new Set(filtroNome);
  const materialSet  = new Set(filtroMaterial);
  const corSet       = new Set(filtroCor);
  const carretelSet  = new Set(filtroCarretel);
  const fornecSet    = new Set(filtroFornecedor);

  // Filtros dinâmicos (faceted search): cada coluna exibe apenas os valores
  // presentes nos registros que passam por TODOS os outros filtros ativos,
  // excluindo o filtro da própria coluna. Assim ao filtrar por Material=PLA,
  // os dropdowns de Cor e Fornecedor atualizam para mostrar só o que existe em PLA.
  function filtrarSemColuna(excluir: "nome" | "material" | "cor" | "carretel" | "fornecedor") {
    return data.filter((r) => {
      const nome     = r.nome_filamento              ?? "-";
      const material = r.material_filamento          ?? "-";
      const cor      = r.cor_filamento               ?? "-";
      const carretel = r.tipo_carretel               ?? "-";
      const fornec   = r.fabricante?.nome_fabricante ?? "-";
      return (
        (excluir === "nome"       || nomeSet.size     === 0 || nomeSet.has(nome))         &&
        (excluir === "material"   || materialSet.size === 0 || materialSet.has(material)) &&
        (excluir === "cor"        || corSet.size      === 0 || corSet.has(cor))           &&
        (excluir === "carretel"   || carretelSet.size === 0 || carretelSet.has(carretel)) &&
        (excluir === "fornecedor" || fornecSet.size   === 0 || fornecSet.has(fornec))
      );
    });
  }

  const opcoesNome       = [...new Set(filtrarSemColuna("nome").map((r)       => r.nome_filamento              ?? "-"))].sort();
  const opcoesMaterial   = [...new Set(filtrarSemColuna("material").map((r)   => r.material_filamento          ?? "-"))].sort();
  const opcoesCor        = [...new Set(filtrarSemColuna("cor").map((r)        => r.cor_filamento               ?? "-"))].sort();
  const opcoesCarretel   = [...new Set(filtrarSemColuna("carretel").map((r)   => r.tipo_carretel               ?? "-"))].sort();
  const opcoesFornecedor = [...new Set(filtrarSemColuna("fornecedor").map((r) => r.fabricante?.nome_fabricante ?? "-"))].sort();

  const dataFiltrada = data.filter((r) => {
    const nome     = r.nome_filamento           ?? "-";
    const material = r.material_filamento       ?? "-";
    const cor      = r.cor_filamento            ?? "-";
    const carretel = r.tipo_carretel            ?? "-";
    const fornec   = r.fabricante?.nome_fabricante ?? "-";
    return (
      (nomeSet.size     === 0 || nomeSet.has(nome))      &&
      (materialSet.size === 0 || materialSet.has(material)) &&
      (corSet.size      === 0 || corSet.has(cor))        &&
      (carretelSet.size === 0 || carretelSet.has(carretel)) &&
      (fornecSet.size   === 0 || fornecSet.has(fornec))
    );
  });

  const algumFiltroAtivo = filtroNome.length > 0 || filtroMaterial.length > 0 ||
    filtroCor.length > 0 || filtroCarretel.length > 0 || filtroFornecedor.length > 0;

  function limparFiltros() {
    setFiltroNome([]); setFiltroMaterial([]); setFiltroCor([]);
    setFiltroCarretel([]); setFiltroFornecedor([]);
  }

  if (!ready) return <div className="p-6 text-slate-100">Carregando...</div>;

  return (
    <PageShell title="Filamentos" description="Cadastre filamentos com material, textura, cor, carretel e fabricante.">
      <Feedback erro={erro} mensagem={mensagem} />

      <GlassCard>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">{editingId ? "Editar filamento" : "Novo filamento"}</h2>
            <p className="mt-1 text-sm text-slate-400">Preencha os dados do filamento. Material e fabricante usam listas padronizadas.</p>
          </div>
          {editingId && (
            <button type="button" onClick={resetForm}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
              Cancelar edicao
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-bold text-slate-300">Nome do filamento *</label>
            <input value={nomeFilamento} onChange={(e) => setNomeFilamento(e.target.value)}
              className={FIELD_CLASS} placeholder="Ex.: PLA Preto 1kg" required />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Material *</label>
            <select value={materialFilamento} onChange={(e) => setMaterialFilamento(e.target.value)}
              className={FIELD_CLASS} required>
              <option value="">Selecione</option>
              {MATERIAIS_FILAMENTO.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Textura</label>
            <select value={texturaFilamento} onChange={(e) => setTexturaFilamento(e.target.value)} className={FIELD_CLASS}>
              <option value="">Selecione</option>
              {TEXTURAS_FILAMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Cor</label>
            <input value={corFilamento} onChange={(e) => setCorFilamento(e.target.value)}
              className={FIELD_CLASS} placeholder="Ex.: Preto" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Carretel</label>
            <select value={tipoCarretel} onChange={(e) => setTipoCarretel(e.target.value)} className={FIELD_CLASS}>
              <option value="">Selecione</option>
              {TIPOS_CARRETEL.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Fornecedor / Fabricante</label>
            <select value={idFabricanteFilamento} onChange={(e) => setIdFabricanteFilamento(e.target.value)} className={FIELD_CLASS}>
              <option value="">Sem fabricante</option>
              {fabricantes.filter((f) => f.ativo !== false).map((f) => (
                <option key={f.id_fabricante_filamento} value={f.id_fabricante_filamento}>{f.nome_fabricante}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">Custo medio (R$)</label>
            <input value={custoMedioBrl} onChange={(e) => setCustoMedioBrl(e.target.value)}
              className={FIELD_CLASS} placeholder="Ex.: 89.90" inputMode="decimal" />
          </div>

          <div className="flex items-end xl:col-span-4">
            <button type="submit" disabled={salvando}
              className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 disabled:opacity-60">
              {salvando ? "Salvando..." : editingId ? "Atualizar filamento" : "Salvar filamento"}
            </button>
          </div>
        </form>
      </GlassCard>

      <GlassCard>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Lista de filamentos</h2>
            <p className="mt-1 text-sm text-slate-400">
              Todos os filamentos cadastrados.
              {algumFiltroAtivo && (
                <span className="ml-2 text-cyan-400">{dataFiltrada.length} de {data.length} visíveis</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {algumFiltroAtivo && (
              <button type="button" onClick={limparFiltros}
                className="flex items-center gap-1 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20">
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
            <button type="button" onClick={() => { carregarFabricantes(); reload(); }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
              Atualizar
            </button>
          </div>
        </div>

        <LoadingOrEmpty loading={loading} empty={data.length === 0}
          loadingText="Carregando filamentos..." emptyText="Nenhum filamento cadastrado.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-separate border-spacing-y-1 text-sm">
              <thead>
                {/* Labels */}
                <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
                  <th className="px-2 pb-1 pt-2">Nome</th>
                  <th className="px-2 pb-1 pt-2">Material</th>
                  <th className="px-2 pb-1 pt-2">Textura</th>
                  <th className="px-2 pb-1 pt-2">Cor</th>
                  <th className="px-2 pb-1 pt-2">Carretel</th>
                  <th className="px-2 pb-1 pt-2">Fornecedor</th>
                  <th className="px-2 pb-1 pt-2">Custo medio</th>
                  <th className="px-2 pb-1 pt-2">Acoes</th>
                </tr>
                {/* Filtros */}
                <tr>
                  <th className="px-2 pb-3">
                    <FiltroColuna label="Nome" opcoes={opcoesNome} selecionados={filtroNome} onChange={setFiltroNome} />
                  </th>
                  <th className="px-2 pb-3">
                    <FiltroColuna label="Material" opcoes={opcoesMaterial} selecionados={filtroMaterial} onChange={setFiltroMaterial} />
                  </th>
                  <th className="px-2 pb-3" />
                  <th className="px-2 pb-3">
                    <FiltroColuna label="Cor" opcoes={opcoesCor} selecionados={filtroCor} onChange={setFiltroCor} />
                  </th>
                  <th className="px-2 pb-3">
                    <FiltroColuna label="Carretel" opcoes={opcoesCarretel} selecionados={filtroCarretel} onChange={setFiltroCarretel} />
                  </th>
                  <th className="px-2 pb-3">
                    <FiltroColuna label="Fornecedor" opcoes={opcoesFornecedor} selecionados={filtroFornecedor} onChange={setFiltroFornecedor} />
                  </th>
                  <th className="px-2 pb-3" />
                  <th className="px-2 pb-3" />
                </tr>
              </thead>
              <tbody>
                {dataFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-500">
                      Nenhum filamento corresponde aos filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  dataFiltrada.map((row) => (
                    <tr key={row.id_filamento} className="rounded-2xl bg-white/[0.035] text-slate-200">
                      <td className="rounded-l-2xl px-4 py-3 font-bold text-white">{row.nome_filamento || "-"}</td>
                      <td className="px-4 py-3">{row.material_filamento || "-"}</td>
                      <td className="px-4 py-3">{row.textura_filamento || "-"}</td>
                      <td className="px-4 py-3">{row.cor_filamento || "-"}</td>
                      <td className="px-4 py-3">{row.tipo_carretel || "-"}</td>
                      <td className="px-4 py-3">{row.fabricante?.nome_fabricante || "-"}</td>
                      <td className="px-4 py-3">
                        {row.custo_medio_brl == null ? "-" : Number(row.custo_medio_brl).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="rounded-r-2xl px-4 py-3">
                        <ActionButtons onEdit={() => fillForEdit(row)} onDelete={() => handleDelete(String(row.id_filamento ?? ""))} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </LoadingOrEmpty>
      </GlassCard>
    </PageShell>
  );
}
