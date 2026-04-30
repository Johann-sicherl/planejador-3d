"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  Clock,
  Edit3,
  Factory,
  GripVertical,
  Package,
  Plus,
  Printer,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Feedback, PageShell } from "../_shared";

type StatusProducao = "pedidos" | "fila" | "producao" | "finalizado";
type Prioridade = "Baixa" | "Média" | "Alta" | "Urgente";
type OptionItem = Record<string, unknown>;

type PlanoProducao = {
  id_pedido: number;
  id_impressora: number | null;
  id_3mf: number | null;
  tempo_impressao_min: number | null;
  status_producao?: StatusProducao | null;
  ordem_fila?: number | null;
  prioridade?: Prioridade | null;
  progresso?: number | null;
  peso_estimado_g?: number | null;
};

type OptionsPayload = {
  clientes: OptionItem[];
  impressoras: OptionItem[];
  componentes: OptionItem[];
  arquivos3mf: OptionItem[];
  filamentos: OptionItem[];
  pedidos: OptionItem[];
  execucoes: OptionItem[];
  planoProducao: OptionItem[];
};

type FormState = {
  id_pedido: string;
  id_impressora: string;
  id_3mf: string;
  tempo_impressao_min: string;
  status_producao: StatusProducao;
  ordem_fila: string;
  prioridade: Prioridade;
  progresso: string;
  peso_estimado_g: string;
};

const EMPTY_FORM: FormState = {
  id_pedido: "",
  id_impressora: "",
  id_3mf: "",
  tempo_impressao_min: "",
  status_producao: "pedidos",
  ordem_fila: "",
  prioridade: "Média",
  progresso: "0",
  peso_estimado_g: "",
};

const colunas: { id: StatusProducao; titulo: string; subtitulo: string; detalhe: string }[] = [
  { id: "pedidos", titulo: "Pedidos cadastrados", subtitulo: "Pedidos ainda nao programados", detalhe: "border-t-cyan-400" },
  { id: "fila", titulo: "Fila de producao", subtitulo: "Ordem planejada de fabricacao", detalhe: "border-t-violet-400" },
  { id: "producao", titulo: "Em producao", subtitulo: "Pecas em execucao", detalhe: "border-t-amber-400" },
  { id: "finalizado", titulo: "Finalizado", subtitulo: "Pedidos concluidos", detalhe: "border-t-emerald-400" },
];

function toNumberOrNull(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function textFrom(row: OptionItem | undefined, fields: string[], fallback: string) {
  if (!row) return fallback;
  for (const field of fields) {
    const value = row[field];
    if (value !== null && value !== undefined && String(value).trim() !== "") return String(value).trim();
  }
  return fallback;
}

function formatTempo(minutos: number | null | undefined) {
  if (!minutos) return "--";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h <= 0) return `${m} min`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

function apiError(result: unknown) {
  if (typeof result === "object" && result && "error" in result) {
    return String((result as { error?: unknown }).error || "Erro desconhecido.");
  }
  return "Erro desconhecido.";
}

export default function PlanoProducaoPage() {
  const [planos, setPlanos] = useState<PlanoProducao[]>([]);
  const [options, setOptions] = useState<OptionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [activePlano, setActivePlano] = useState<PlanoProducao | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function carregarDados() {
    try {
      setLoading(true);
      setErro("");
      const [planoResponse, optionsResponse] = await Promise.all([
        fetch("/api/plano-producao", { cache: "no-store" }),
        fetch("/api/options", { cache: "no-store" }),
      ]);

      const planoResult = await planoResponse.json();
      const optionsResult = await optionsResponse.json();

      if (!planoResponse.ok || !planoResult.ok) throw new Error(apiError(planoResult));
      if (!optionsResponse.ok || !optionsResult.ok) throw new Error(apiError(optionsResult));

      setPlanos(planoResult.data || []);
      setOptions(optionsResult.data?.[0] || null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar plano de producao.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const nomes = useMemo(() => {
    const pedidos = new Map<number, string>();
    const impressoras = new Map<number, string>();
    const arquivos3mf = new Map<number, string>();

    for (const item of options?.impressoras || []) {
      const id = asNumber(item.id_impressora);
      if (id !== null) impressoras.set(id, textFrom(item, ["nome_impressora", "nome", "modelo", "descricao"], "Impressora sem nome"));
    }

    for (const item of options?.arquivos3mf || []) {
      const id = asNumber(item.id_3mf);
      if (id !== null) arquivos3mf.set(id, textFrom(item, ["nome_arquivo_3mf", "nome_arquivo", "filename", "arquivo", "descricao"], "Arquivo 3MF sem nome"));
    }

    for (const item of options?.pedidos || []) {
      const id = asNumber(item.id_pedido);
      if (id !== null) pedidos.set(id, textFrom(item, ["label_pedido", "nome_pedido", "numero_pedido", "codigo_pedido", "pedido"], "Pedido cadastrado"));
    }

    return { pedidos, impressoras, arquivos3mf };
  }, [options]);

  function novoPlano() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setMensagem("");
    setErro("");
  }

  function editarPlano(plano: PlanoProducao) {
    setEditingId(plano.id_pedido);
    setForm({
      id_pedido: String(plano.id_pedido ?? ""),
      id_impressora: String(plano.id_impressora ?? ""),
      id_3mf: String(plano.id_3mf ?? ""),
      tempo_impressao_min: String(plano.tempo_impressao_min ?? ""),
      status_producao: plano.status_producao || "pedidos",
      ordem_fila: String(plano.ordem_fila ?? ""),
      prioridade: plano.prioridade || "Média",
      progresso: String(plano.progresso ?? 0),
      peso_estimado_g: String(plano.peso_estimado_g ?? ""),
    });
    setFormOpen(true);
    setMensagem("");
    setErro("");
  }

  async function salvarPlano(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      setErro("");
      setMensagem("");

      const payload = {
        id_pedido: toNumberOrNull(form.id_pedido),
        id_impressora: toNumberOrNull(form.id_impressora),
        id_3mf: toNumberOrNull(form.id_3mf),
        tempo_impressao_min: toNumberOrNull(form.tempo_impressao_min),
        status_producao: form.status_producao,
        ordem_fila: toNumberOrNull(form.ordem_fila),
        prioridade: form.prioridade,
        progresso: toNumberOrNull(form.progresso),
        peso_estimado_g: toNumberOrNull(form.peso_estimado_g),
      };

      const response = await fetch("/api/plano-producao", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(apiError(result));

      setMensagem(editingId ? "Plano atualizado com sucesso." : "Pedido adicionado ao plano de producao.");
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await carregarDados();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar plano.");
    } finally {
      setSaving(false);
    }
  }

  async function excluirPlano(idPedido: number) {
    if (!window.confirm("Excluir este pedido do plano de producao?")) return;
    try {
      setErro("");
      setMensagem("");
      const response = await fetch(`/api/plano-producao?id=${idPedido}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(apiError(result));
      setMensagem("Pedido removido do plano de producao.");
      await carregarDados();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir plano.");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const plano = planos.find((p) => String(p.id_pedido) === String(event.active.id));
    if (plano) setActivePlano(plano);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActivePlano(null);
    if (!over) return;

    const idPedido = Number(active.id);
    const destino = String(over.id) as StatusProducao;
    if (!colunas.some((coluna) => coluna.id === destino)) return;

    const planoAtual = planos.find((plano) => plano.id_pedido === idPedido);
    if (!planoAtual || planoAtual.status_producao === destino) return;

    const backup = planos;
    const progressoDestino = destino === "finalizado" ? 100 : destino === "producao" ? planoAtual.progresso || 1 : planoAtual.progresso || 0;

    setPlanos((atuais) =>
      atuais.map((plano) =>
        plano.id_pedido === idPedido ? { ...plano, status_producao: destino, progresso: progressoDestino } : plano
      )
    );

    const response = await fetch("/api/plano-producao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...planoAtual, status_producao: destino, progresso: progressoDestino }),
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      setPlanos(backup);
      setErro(apiError(result));
    }
  }

  const total = planos.length;
  const naFila = planos.filter((p) => (p.status_producao || "pedidos") === "fila").length;
  const produzindo = planos.filter((p) => (p.status_producao || "pedidos") === "producao").length;
  const finalizados = planos.filter((p) => (p.status_producao || "pedidos") === "finalizado").length;

  return (
    <PageShell title="Plano de Produ\u00e7\u00e3o" description="Organize os pedidos em uma fila visual, mantendo os dados reais cadastrados no banco.">
      <style jsx global>{`
        .field {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(15, 23, 42, 0.9);
          padding: 0.85rem 1rem;
          color: #f8fafc;
          outline: none;
        }
        .field:focus {
          border-color: rgba(34, 211, 238, 0.65);
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12);
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Indicador titulo="Total" valor={total} subtitulo="No plano" />
          <Indicador titulo="Na fila" valor={naFila} subtitulo="Aguardando" />
          <Indicador titulo="Produzindo" valor={produzindo} subtitulo="Em execucao" />
          <Indicador titulo="Finalizados" valor={finalizados} subtitulo="Concluidos" />
        </div>

        <button onClick={novoPlano} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 hover:brightness-110">
          <Plus className="h-4 w-4" />
          Adicionar pedido ao plano
        </button>
      </div>

      <Feedback erro={erro} mensagem={mensagem} />

      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={salvarPlano} className="mx-auto my-8 max-w-5xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-500/10">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">{editingId ? "Editar plano de producao" : "Adicionar pedido ao plano"}</h2>
                <p className="mt-1 text-sm text-slate-400">Selecione pelos nomes cadastrados. Os IDs ficam ocultos e sao enviados apenas internamente.</p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Pedido cadastrado">
                <select value={form.id_pedido} onChange={(e) => setForm((f) => ({ ...f, id_pedido: e.target.value }))} disabled={Boolean(editingId)} required className="field">
                  <option value="">Selecione o pedido</option>
                  {(options?.pedidos || []).map((pedido) => {
                    const id = asNumber(pedido.id_pedido);
                    if (id === null) return null;
                    return <option key={id} value={id}>{textFrom(pedido, ["label_pedido", "nome_pedido", "numero_pedido", "codigo_pedido", "pedido"], "Pedido cadastrado")}</option>;
                  })}
                </select>
              </Field>

              <Field label="Impressora">
                <select value={form.id_impressora} onChange={(e) => setForm((f) => ({ ...f, id_impressora: e.target.value }))} className="field">
                  <option value="">Selecione a impressora</option>
                  {(options?.impressoras || []).map((imp) => {
                    const id = asNumber(imp.id_impressora);
                    if (id === null) return null;
                    return <option key={id} value={id}>{textFrom(imp, ["nome_impressora", "nome", "modelo", "descricao"], "Impressora sem nome")}</option>;
                  })}
                </select>
              </Field>

              <Field label="Arquivo 3MF">
                <select value={form.id_3mf} onChange={(e) => setForm((f) => ({ ...f, id_3mf: e.target.value }))} className="field">
                  <option value="">Selecione o arquivo 3MF</option>
                  {(options?.arquivos3mf || []).map((arquivo) => {
                    const id = asNumber(arquivo.id_3mf);
                    if (id === null) return null;
                    return <option key={id} value={id}>{textFrom(arquivo, ["nome_arquivo_3mf", "nome_arquivo", "filename", "arquivo", "descricao"], "Arquivo 3MF sem nome")}</option>;
                  })}
                </select>
              </Field>

              <Field label="Status">
                <select value={form.status_producao} onChange={(e) => setForm((f) => ({ ...f, status_producao: e.target.value as StatusProducao }))} className="field">
                  <option value="pedidos">Pedidos cadastrados</option>
                  <option value="fila">Fila</option>
                  <option value="producao">Em producao</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </Field>

              <Field label="Prioridade">
                <select value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value as Prioridade }))} className="field">
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Media</option>
                  <option value="Alta">Alta</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </Field>

              <Field label="Tempo de impressao em minutos">
                <input value={form.tempo_impressao_min} onChange={(e) => setForm((f) => ({ ...f, tempo_impressao_min: e.target.value }))} type="number" min="0" className="field" />
              </Field>

              <Field label="Peso estimado em gramas">
                <input value={form.peso_estimado_g} onChange={(e) => setForm((f) => ({ ...f, peso_estimado_g: e.target.value }))} type="number" min="0" className="field" />
              </Field>

              <Field label="Ordem na fila">
                <input value={form.ordem_fila} onChange={(e) => setForm((f) => ({ ...f, ordem_fila: e.target.value }))} type="number" min="0" className="field" />
              </Field>

              <Field label="Progresso %">
                <input value={form.progresso} onChange={(e) => setForm((f) => ({ ...f, progresso: e.target.value }))} type="number" min="0" max="100" className="field" />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/10">Cancelar</button>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] py-12 text-center text-sm text-slate-400">Carregando plano de producao real...</div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <section className="w-full overflow-x-auto pb-3">
            <div className="grid min-w-[1200px] grid-cols-4 gap-5">
              {colunas.map((coluna) => {
                const planosDaColuna = planos.filter((plano) => (plano.status_producao || "pedidos") === coluna.id);
                return (
                  <ColunaProducao
                    key={coluna.id}
                    id={coluna.id}
                    titulo={coluna.titulo}
                    subtitulo={coluna.subtitulo}
                    detalhe={coluna.detalhe}
                    planos={planosDaColuna}
                    nomes={nomes}
                    onEdit={editarPlano}
                    onDelete={excluirPlano}
                  />
                );
              })}
            </div>
          </section>
          <DragOverlay>{activePlano ? <CardPlano plano={activePlano} nomes={nomes} flutuando /> : null}</DragOverlay>
        </DndContext>
      )}
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">{label}</span>
      {children}
    </label>
  );
}

function Indicador({ titulo, valor, subtitulo }: { titulo: string; valor: number; subtitulo: string }) {
  return (
    <div className="min-w-32 rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-xl backdrop-blur-xl">
      <p className="text-xs text-slate-400">{titulo}</p>
      <p className="mt-1 text-3xl font-black text-white">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitulo}</p>
    </div>
  );
}

function ColunaProducao({ id, titulo, subtitulo, detalhe, planos, nomes, onEdit, onDelete }: { id: StatusProducao; titulo: string; subtitulo: string; detalhe: string; planos: PlanoProducao[]; nomes: { pedidos: Map<number, string>; impressoras: Map<number, string>; arquivos3mf: Map<number, string> }; onEdit: (plano: PlanoProducao) => void; onDelete: (idPedido: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`h-[calc(100vh-290px)] min-h-[560px] overflow-hidden rounded-3xl border border-white/10 border-t-4 ${detalhe} ${isOver ? "bg-cyan-400/10 shadow-2xl shadow-cyan-500/20" : "bg-white/[0.04]"}`}>
      <div className="flex items-start justify-between border-b border-white/10 p-4">
        <div>
          <h2 className="text-lg font-black text-white">{titulo}</h2>
          <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">{planos.length}</span>
      </div>

      <SortableContext items={planos.map((plano) => String(plano.id_pedido))} strategy={verticalListSortingStrategy}>
        <div className="h-[calc(100%-82px)] space-y-4 overflow-y-auto p-4">
          {planos.map((plano) => <CardPlano key={plano.id_pedido} plano={plano} nomes={nomes} onEdit={onEdit} onDelete={onDelete} />)}
        </div>
      </SortableContext>
    </div>
  );
}

function CardPlano({ plano, nomes, flutuando = false, onEdit, onDelete }: { plano: PlanoProducao; nomes: { pedidos: Map<number, string>; impressoras: Map<number, string>; arquivos3mf: Map<number, string> }; flutuando?: boolean; onEdit?: (plano: PlanoProducao) => void; onDelete?: (idPedido: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(plano.id_pedido) });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const prioridade = plano.prioridade || "Média";
  const status = plano.status_producao || "pedidos";
  const progresso = plano.progresso ?? 0;
  const impressora = plano.id_impressora ? nomes.impressoras.get(plano.id_impressora) : "Sem impressora";
  const arquivo = plano.id_3mf ? nomes.arquivos3mf.get(plano.id_3mf) : "Sem arquivo 3MF";
  const tituloPedido = nomes.pedidos.get(plano.id_pedido) || "Pedido cadastrado";

  const corPrioridade = {
    Baixa: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    Média: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    Alta: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    Urgente: "bg-red-500/15 text-red-300 border-red-500/30",
  }[prioridade];

  return (
    <article ref={setNodeRef} style={style} className={`rounded-3xl border border-white/10 bg-slate-900/90 p-4 shadow-xl backdrop-blur transition-all hover:border-cyan-400/50 ${isDragging ? "opacity-40" : "opacity-100"} ${flutuando ? "rotate-2 scale-105 shadow-2xl shadow-cyan-500/20" : ""}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 shrink-0 text-cyan-400" />
            <h3 className="line-clamp-2 font-black text-white">{tituloPedido}</h3>
          </div>
          <p className="mt-2 text-xs text-slate-400">Ordem: {plano.ordem_fila ?? "--"}</p>
        </div>
        <button type="button" className="cursor-grab rounded-xl bg-white/10 p-2 text-slate-300 active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${corPrioridade}`}>{prioridade === "Média" ? "Media" : prioridade}</span>
        <span className="flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-300">
          <Printer className="h-3 w-3" />
          {impressora}
        </span>
      </div>

      <div className="rounded-2xl bg-black/20 p-3">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">Arquivo 3MF</p>
        <p className="text-sm font-semibold text-slate-100">{arquivo}</p>
      </div>

      {(status === "producao" || status === "finalizado") && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Progresso</span><span>{progresso}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }} /></div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/5 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400"><Clock className="h-3.5 w-3.5" />Tempo</div>
          <p className="mt-1 text-sm font-black text-white">{formatTempo(plano.tempo_impressao_min)}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400"><Factory className="h-3.5 w-3.5" />Material</div>
          <p className="mt-1 text-sm font-black text-white">{plano.peso_estimado_g ?? "--"} g</p>
        </div>
      </div>

      {!flutuando && (
        <div className="mt-4 flex gap-2 border-t border-white/10 pt-4">
          <button type="button" onClick={() => onEdit?.(plano)} className="inline-flex items-center gap-1 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20"><Edit3 className="h-3.5 w-3.5" />Editar</button>
          <button type="button" onClick={() => onDelete?.(plano.id_pedido)} className="inline-flex items-center gap-1 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-400/20"><Trash2 className="h-3.5 w-3.5" />Excluir</button>
          {status === "finalizado" && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-400" />}
        </div>
      )}
    </article>
  );
}
