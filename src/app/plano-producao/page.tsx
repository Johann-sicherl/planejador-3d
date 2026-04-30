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
  Sparkles,
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

type Nomes = {
  pedidos: Map<number, string>;
  clientes: Map<number, string>;
  impressoras: Map<number, string>;
  arquivos3mf: Map<number, string>;
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
  {
    id: "pedidos",
    titulo: "Pedidos cadastrados",
    subtitulo: "Pedidos ainda não programados",
    detalhe: "border-t-cyan-400",
  },
  {
    id: "fila",
    titulo: "Fila de produção",
    subtitulo: "Ordem planejada de fabricação",
    detalhe: "border-t-violet-400",
  },
  {
    id: "producao",
    titulo: "Em produção",
    subtitulo: "Peças em execução",
    detalhe: "border-t-amber-400",
  },
  {
    id: "finalizado",
    titulo: "Finalizado",
    subtitulo: "Pedidos concluídos",
    detalhe: "border-t-emerald-400",
  },
];

function toNumberOrNull(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function asText(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function labelFrom(row: OptionItem | undefined, fields: string[], fallback: string) {
  if (!row) return fallback;

  for (const field of fields) {
    const value = row[field];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
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

function numberFromFields(row: OptionItem | undefined, fields: string[]) {
  if (!row) return null;

  for (const field of fields) {
    const value = row[field];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  return null;
}

function calcularPesoEstimadoPor3mf(optionsData: OptionsPayload | null, id3mfTexto: string) {
  if (!optionsData || !id3mfTexto) return "";

  const id3mf = Number(id3mfTexto);
  if (Number.isNaN(id3mf)) return "";

  const arquivo3mf = (optionsData.arquivos3mf || []).find((item) => {
    const possiveisIds = [
      numberFromFields(item, ["id_3mf"]),
      numberFromFields(item, ["id"]),
      numberFromFields(item, ["id_arquivo_3mf"]),
      numberFromFields(item, ["arquivo_3mf_id"]),
    ].filter((value): value is number => value !== null);

    return possiveisIds.includes(id3mf);
  });

  const idComponente = numberFromFields(arquivo3mf, [
    "id_componente_stl",
    "id_componente",
    "id_componente_fk",
    "componente_id",
    "id_stl",
    "stl_id",
  ]);

  if (idComponente === null) return "";

  const componente = (optionsData.componentes || []).find((item) => {
    const possiveisIds = [
      numberFromFields(item, ["id_componente_stl"]),
      numberFromFields(item, ["id_componente"]),
      numberFromFields(item, ["id"]),
      numberFromFields(item, ["componente_id"]),
    ].filter((value): value is number => value !== null);

    return possiveisIds.includes(idComponente);
  });

  const pesoComponente = numberFromFields(componente, [
    "peso_g",
    "peso_estimado_g",
    "peso_componente_g",
    "peso_gramas",
    "peso_unitario_g",
    "peso_unit_g",
    "peso_liquido_g",
    "peso_stl_g",
    "massa_g",
    "gramas",
    "peso_componente",
    "peso",
  ]);

  const quantidadeNo3mf = numberFromFields(arquivo3mf, [
    "qtd_componente",
    "quantidade_componentes",
    "quantidade_componente",
    "qtde_componente",
    "qtd_stl",
    "quantidade_stl",
    "qtd_pecas",
    "quantidade_pecas",
    "quantidade",
    "qtd",
    "qtde",
  ]);

  if (pesoComponente === null || quantidadeNo3mf === null) return "";

  return String(Number((pesoComponente * quantidadeNo3mf).toFixed(3)));
}

function calcularPesoEstimadoPedido(optionsData: OptionsPayload | null, idPedidoTexto: string) {
  if (!optionsData || !idPedidoTexto) return "";

  const idPedido = Number(idPedidoTexto);
  if (Number.isNaN(idPedido)) return "";

  const pedido = (optionsData.pedidos || []).find(
    (item) => Number(item.id_pedido) === idPedido
  );

  const id3mf = numberFromFields(pedido, [
    "id_3mf",
    "id_arquivo_3mf",
    "id_arquivo",
    "arquivo_3mf_id",
  ]);

  if (id3mf === null) return "";

  return calcularPesoEstimadoPor3mf(optionsData, String(id3mf));
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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
      setErro(err instanceof Error ? err.message : "Erro ao carregar plano de produção.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const nomes = useMemo(() => {
    const pedidos = new Map<number, string>();
    const clientes = new Map<number, string>();
    const impressoras = new Map<number, string>();
    const arquivos3mf = new Map<number, string>();

    for (const item of options?.clientes || []) {
      clientes.set(
        Number(item.id_cliente),
        labelFrom(item, ["nome_cliente", "cliente", "razao_social", "nome"], "Cliente sem nome")
      );
    }

    for (const item of options?.impressoras || []) {
      impressoras.set(
        Number(item.id_impressora),
        labelFrom(item, ["nome_impressora", "nome", "modelo", "descricao"], "Impressora sem nome")
      );
    }

    for (const item of options?.arquivos3mf || []) {
      arquivos3mf.set(
        Number(item.id_3mf),
        labelFrom(item, ["nome_arquivo_3mf", "nome_arquivo", "filename", "arquivo", "descricao"], "Arquivo 3MF sem nome")
      );
    }

    for (const item of options?.pedidos || []) {
      const id = Number(item.id_pedido);
      const label = labelFrom(item, ["label_pedido", "nome_pedido", "numero_pedido", "codigo_pedido"], "Pedido cadastrado");
      pedidos.set(id, label);
    }

    return { pedidos, clientes, impressoras, arquivos3mf };
  }, [options]);

  function pedidoSelecionado() {
    const id = Number(form.id_pedido);
    return (options?.pedidos || []).find((pedido) => Number(pedido.id_pedido) === id);
  }

  function sugerirImpressora() {
    const impressoras = options?.impressoras || [];
    if (impressoras.length === 0) {
      setErro("Nenhuma impressora cadastrada para sugerir.");
      return;
    }

    const impressorasEmProducao = new Set(
      planos
        .filter((plano) => plano.status_producao === "producao" && plano.id_impressora)
        .map((plano) => Number(plano.id_impressora))
    );

    const impressoraLivre = impressoras.find(
      (imp) => !impressorasEmProducao.has(Number(imp.id_impressora))
    );

    const sugestao = impressoraLivre || impressoras[0];

    setForm((atual) => ({
      ...atual,
      id_impressora: String(sugestao.id_impressora),
    }));

    setMensagem(`Impressora sugerida: ${labelFrom(sugestao, ["nome_impressora", "nome", "modelo", "descricao"], "Impressora sem nome")}.`);
  }

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

      const pedido = pedidoSelecionado();
      const id3mfPedido = pedido?.id_3mf ? String(pedido.id_3mf) : "";

      const payload = {
        id_pedido: toNumberOrNull(form.id_pedido),
        id_impressora: toNumberOrNull(form.id_impressora),
        id_3mf: toNumberOrNull(form.id_3mf || id3mfPedido),
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

      setMensagem(editingId ? "Plano atualizado com sucesso." : "Pedido adicionado ao plano de produção.");
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
    const confirmar = window.confirm("Excluir este pedido do plano de produção?");
    if (!confirmar) return;

    try {
      setErro("");
      setMensagem("");

      const response = await fetch(`/api/plano-producao?id=${idPedido}`, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok || !result.ok) throw new Error(apiError(result));

      setMensagem("Pedido removido do plano de produção.");
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
    const colunaDestino = colunas.some((coluna) => coluna.id === destino);

    if (!colunaDestino) return;

    const planoAtual = planos.find((plano) => plano.id_pedido === idPedido);
    if (!planoAtual || planoAtual.status_producao === destino) return;

    const backup = planos;

    setPlanos((atuais) =>
      atuais.map((plano) =>
        plano.id_pedido === idPedido
          ? {
              ...plano,
              status_producao: destino,
              progresso: destino === "finalizado" ? 100 : destino === "producao" ? plano.progresso || 1 : plano.progresso || 0,
            }
          : plano
      )
    );

    const response = await fetch("/api/plano-producao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...planoAtual,
        status_producao: destino,
        progresso: destino === "finalizado" ? 100 : planoAtual.progresso || 0,
      }),
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
    <PageShell
      title="Plano de Produção"
      description="Defina a fila, a impressora e a execução dos pedidos. O cadastro de pedidos não define mais impressora."
    >
      <Feedback erro={erro} mensagem={mensagem} />

      <div className="grid gap-3 md:grid-cols-4">
        <Indicador titulo="Total" valor={total} subtitulo="Pedidos no plano" />
        <Indicador titulo="Na fila" valor={naFila} subtitulo="Aguardando produção" />
        <Indicador titulo="Produzindo" valor={produzindo} subtitulo="Em execução" />
        <Indicador titulo="Finalizados" valor={finalizados} subtitulo="Concluídos" />
      </div>

      <div className="flex justify-end">
        <button
          onClick={novoPlano}
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300"
        >
          <Plus className="h-4 w-4" />
          Adicionar pedido ao plano
        </button>
      </div>

      {formOpen && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">
                {editingId ? "Editar plano de produção" : "Adicionar pedido ao plano"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Selecione o pedido real já cadastrado e defina a impressora somente aqui.
              </p>
            </div>

            <button
              onClick={() => setFormOpen(false)}
              className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={salvarPlano} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Pedido">
              <select
                value={form.id_pedido}
                onChange={(e) => {
                  const pedido = (options?.pedidos || []).find((p) => String(p.id_pedido) === e.target.value);
                          const id3mf = pedido?.id_3mf ? String(pedido.id_3mf) : "";
                          const pesoEstimado = id3mf ? calcularPesoEstimadoPor3mf(options, id3mf) : calcularPesoEstimadoPedido(options, e.target.value);
                          setForm((f) => ({
                            ...f,
                            id_pedido: e.target.value,
                            id_3mf: id3mf || f.id_3mf,
                            peso_estimado_g: pesoEstimado,
                          }));
                }}
                disabled={Boolean(editingId)}
                required
                className="field"
              >
                <option value="">Selecione</option>
                {(options?.pedidos || []).map((pedido) => (
                  <option key={String(pedido.id_pedido)} value={String(pedido.id_pedido)}>
                    {labelFrom(pedido, ["label_pedido", "nome_pedido", "numero_pedido", "codigo_pedido"], "Pedido cadastrado")}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Impressora">
              <div className="flex gap-2">
                <select
                  value={form.id_impressora}
                  onChange={(e) => setForm((f) => ({ ...f, id_impressora: e.target.value }))}
                  className="field"
                >
                  <option value="">Selecione</option>
                  {(options?.impressoras || []).map((imp) => (
                    <option key={String(imp.id_impressora)} value={String(imp.id_impressora)}>
                      {labelFrom(imp, ["nome_impressora", "nome", "modelo", "descricao"], "Impressora sem nome")}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={sugerirImpressora}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 text-cyan-300 hover:bg-cyan-400/20"
                  title="Sugerir impressora disponível"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </Field>

            <Field label="Arquivo 3MF">
              <select
                value={form.id_3mf}
                onChange={(e) => setForm((f) => ({ ...f, id_3mf: e.target.value }))}
                className="field"
              >
                <option value="">Selecione</option>
                {(options?.arquivos3mf || []).map((arquivo) => (
                  <option key={String(arquivo.id_3mf)} value={String(arquivo.id_3mf)}>
                    {labelFrom(arquivo, ["nome_arquivo_3mf", "nome_arquivo", "filename", "arquivo", "descricao"], "Arquivo 3MF sem nome")}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={form.status_producao}
                onChange={(e) => setForm((f) => ({ ...f, status_producao: e.target.value as StatusProducao }))}
                className="field"
              >
                <option value="pedidos">Pedidos cadastrados</option>
                <option value="fila">Fila</option>
                <option value="producao">Em produção</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </Field>

            <Field label="Prioridade">
              <select
                value={form.prioridade}
                onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value as Prioridade }))}
                className="field"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </Field>

            <Field label="Tempo de impressão (min)">
              <input
                value={form.tempo_impressao_min}
                onChange={(e) => setForm((f) => ({ ...f, tempo_impressao_min: e.target.value }))}
                type="number"
                min="0"
                className="field"
              />
            </Field>

            <Field label="Peso estimado (g)">
              <input
                value={form.peso_estimado_g}
                onChange={(e) => setForm((f) => ({ ...f, peso_estimado_g: e.target.value }))}
                type="number"
                min="0"
                className="field"
              />
            </Field>

            <Field label="Ordem da fila">
              <input
                value={form.ordem_fila}
                onChange={(e) => setForm((f) => ({ ...f, ordem_fila: e.target.value }))}
                type="number"
                min="0"
                className="field"
              />
            </Field>

            <Field label="Progresso (%)">
              <input
                value={form.progresso}
                onChange={(e) => setForm((f) => ({ ...f, progresso: e.target.value }))}
                type="number"
                min="0"
                max="100"
                className="field"
              />
            </Field>

            <div className="flex items-end gap-3 xl:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar"}
              </button>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] py-12 text-center text-sm text-slate-400">
          Carregando plano de produção real...
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <section className="flex gap-5 overflow-x-auto pb-4">
            {colunas.map((coluna) => {
              const planosDaColuna = planos.filter(
                (plano) => (plano.status_producao || "pedidos") === coluna.id
              );

              return (
                <ColunaProducao
                  key={coluna.id}
                  coluna={coluna}
                  planos={planosDaColuna}
                  nomes={nomes}
                  onEdit={editarPlano}
                  onDelete={excluirPlano}
                />
              );
            })}
          </section>

          <DragOverlay>
            {activePlano ? <CardPlano plano={activePlano} nomes={nomes} flutuando /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <style jsx global>{`
        .field {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(2, 6, 23, 0.75);
          padding: 0.625rem 0.75rem;
          color: white;
          outline: none;
        }
        .field:focus {
          border-color: rgb(34, 211, 238);
        }
      `}</style>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Indicador({ titulo, valor, subtitulo }: { titulo: string; valor: number; subtitulo: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{titulo}</p>
      <p className="mt-2 text-3xl font-black text-white">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitulo}</p>
    </div>
  );
}

function ColunaProducao({
  coluna,
  planos,
  nomes,
  onEdit,
  onDelete,
}: {
  coluna: { id: StatusProducao; titulo: string; subtitulo: string; detalhe: string };
  planos: PlanoProducao[];
  nomes: Nomes;
  onEdit: (plano: PlanoProducao) => void;
  onDelete: (idPedido: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[640px] w-[360px] shrink-0 rounded-3xl border border-white/10 border-t-4 ${coluna.detalhe} p-4 transition-all ${
        isOver ? "bg-cyan-400/10 shadow-2xl shadow-cyan-500/20" : "bg-white/[0.04]"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">{coluna.titulo}</h2>
          <p className="mt-1 text-xs text-slate-400">{coluna.subtitulo}</p>
        </div>

        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
          {planos.length}
        </span>
      </div>

      <SortableContext items={planos.map((plano) => String(plano.id_pedido))} strategy={verticalListSortingStrategy}>
        <div className="max-h-[calc(100vh-360px)] space-y-4 overflow-y-auto pr-1">
          {planos.map((plano) => (
            <CardPlano
              key={plano.id_pedido}
              plano={plano}
              nomes={nomes}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function CardPlano({
  plano,
  nomes,
  flutuando = false,
  onEdit,
  onDelete,
}: {
  plano: PlanoProducao;
  nomes: Nomes;
  flutuando?: boolean;
  onEdit?: (plano: PlanoProducao) => void;
  onDelete?: (idPedido: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(plano.id_pedido),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const prioridade = plano.prioridade || "Média";
  const progresso = plano.progresso ?? 0;

  const corPrioridade = {
    Baixa: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    Média: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
    Alta: "border-orange-500/30 bg-orange-500/15 text-orange-300",
    Urgente: "border-red-500/30 bg-red-500/15 text-red-300",
  }[prioridade];

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`group rounded-3xl border border-white/10 bg-slate-900/90 p-4 shadow-xl backdrop-blur transition-all hover:-translate-y-1 hover:border-cyan-400/50 ${
        isDragging ? "opacity-40" : "opacity-100"
      } ${flutuando ? "rotate-2 scale-105 shadow-2xl shadow-cyan-500/20" : ""}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-cyan-400" />
            <h3 className="font-black text-white">
              {nomes.pedidos.get(Number(plano.id_pedido)) || `Pedido ${plano.id_pedido}`}
            </h3>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <Printer className="h-3.5 w-3.5" />
            <span>{plano.id_impressora ? nomes.impressoras.get(Number(plano.id_impressora)) : "Impressora não definida"}</span>
          </div>
        </div>

        <button
          className="cursor-grab rounded-xl bg-white/10 p-2 text-slate-300 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${corPrioridade}`}>
          {prioridade}
        </span>

        {plano.status_producao === "finalizado" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Concluído
          </span>
        )}
      </div>

      <div className="space-y-2 rounded-2xl bg-black/20 p-3 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-violet-300" />
          <span>{plano.id_3mf ? nomes.arquivos3mf.get(Number(plano.id_3mf)) : "Arquivo 3MF não definido"}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-300" />
          <span>{formatTempo(plano.tempo_impressao_min)}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>Progresso</span>
          <span>{progresso}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(Math.max(progresso, 0), 100)}%` }} />
        </div>
      </div>

      {!flutuando && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onEdit?.(plano)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Editar
          </button>

          <button
            onClick={() => onDelete?.(plano.id_pedido)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-400/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </button>
        </div>
      )}
    </article>
  );
}
