"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
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
  Factory,
  GripVertical,
  Package,
  Printer,
  User,
} from "lucide-react";
import { PageShell, GlassCard } from "../_shared";

type StatusProducao = "pedidos" | "fila" | "producao" | "finalizado";

type ItemPedido = {
  id: string;
  descricao: string;
  quantidade: number;
  material: string;
};

type PedidoCard = {
  id: string;
  numeroPedido: string;
  cliente: string;
  prioridade: "Baixa" | "Média" | "Alta" | "Urgente";
  status: StatusProducao;
  impressora?: string;
  tempoEstimado: string;
  pesoEstimado: string;
  progresso?: number;
  itens: ItemPedido[];
};

const colunas: {
  id: StatusProducao;
  titulo: string;
  subtitulo: string;
  detalhe: string;
}[] = [
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

const pedidosMock: PedidoCard[] = [
  {
    id: "pedido-001",
    numeroPedido: "PED-0012",
    cliente: "Tech Solutions",
    prioridade: "Alta",
    status: "pedidos",
    impressora: "Bambu Lab P1S",
    tempoEstimado: "7h 30min",
    pesoEstimado: "320 g",
    itens: [
      { id: "item-001", descricao: "Suporte estrutural", quantidade: 4, material: "PETG Preto" },
      { id: "item-002", descricao: "Tampa frontal", quantidade: 2, material: "PLA Branco" },
    ],
  },
  {
    id: "pedido-002",
    numeroPedido: "PED-0015",
    cliente: "Clínica MedTech",
    prioridade: "Urgente",
    status: "fila",
    impressora: "Bambu Lab P1S",
    tempoEstimado: "8h 45min",
    pesoEstimado: "450 g",
    itens: [
      { id: "item-003", descricao: "Protetor facial", quantidade: 10, material: "PETG Transparente" },
      { id: "item-004", descricao: "Ajuste lateral", quantidade: 6, material: "PETG Preto" },
    ],
  },
  {
    id: "pedido-003",
    numeroPedido: "PED-0010",
    cliente: "Tech Solutions",
    prioridade: "Média",
    status: "producao",
    impressora: "Bambu Lab P1S",
    tempoEstimado: "7h 30min",
    pesoEstimado: "320 g",
    progresso: 65,
    itens: [
      { id: "item-005", descricao: "Suporte estrutural", quantidade: 4, material: "PETG Preto" },
      { id: "item-006", descricao: "Tampa frontal", quantidade: 2, material: "PLA Branco" },
    ],
  },
  {
    id: "pedido-004",
    numeroPedido: "PED-0008",
    cliente: "Print Store",
    prioridade: "Baixa",
    status: "finalizado",
    impressora: "Ender 3 S1",
    tempoEstimado: "2h 45min",
    pesoEstimado: "150 g",
    progresso: 100,
    itens: [
      { id: "item-007", descricao: "Organizador de mesa", quantidade: 4, material: "PLA Branco" },
      { id: "item-008", descricao: "Suporte celular", quantidade: 2, material: "PLA Branco" },
    ],
  },
];

export default function PlanoProducaoPage() {
  const [pedidos, setPedidos] = useState<PedidoCard[]>(pedidosMock);
  const [activePedido, setActivePedido] = useState<PedidoCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const pedido = pedidos.find((p) => p.id === event.active.id);
    if (pedido) setActivePedido(pedido);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActivePedido(null);

    if (!over) return;

    const pedidoId = String(active.id);
    const destino = String(over.id) as StatusProducao;
    const colunaDestino = colunas.some((coluna) => coluna.id === destino);

    if (!colunaDestino) return;

    setPedidos((pedidosAtuais) =>
      pedidosAtuais.map((pedido) =>
        pedido.id === pedidoId
          ? {
              ...pedido,
              status: destino,
              progresso: destino === "finalizado" ? 100 : pedido.progresso,
            }
          : pedido
      )
    );
  }

  return (
    <PageShell
      title="Plano de Produção"
      description="Organize os pedidos em uma fila visual, arraste os cards entre etapas e acompanhe a execução da produção."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Indicador titulo="Pedidos cadastrados" valor={String(pedidos.length)} subtitulo="Total no plano" />
        <Indicador titulo="Na fila" valor={String(pedidos.filter((p) => p.status === "fila").length)} subtitulo="Aguardando produção" />
        <Indicador titulo="Em produção" valor={String(pedidos.filter((p) => p.status === "producao").length)} subtitulo="Produzindo agora" />
        <Indicador titulo="Finalizados" valor={String(pedidos.filter((p) => p.status === "finalizado").length)} subtitulo="Concluídos" />
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <section className="grid gap-5 xl:grid-cols-4">
          {colunas.map((coluna) => {
            const pedidosDaColuna = pedidos.filter((pedido) => pedido.status === coluna.id);

            return (
              <ColunaProducao
                key={coluna.id}
                id={coluna.id}
                titulo={coluna.titulo}
                subtitulo={coluna.subtitulo}
                detalhe={coluna.detalhe}
                pedidos={pedidosDaColuna}
              />
            );
          })}
        </section>

        <DragOverlay>{activePedido ? <CardPedido pedido={activePedido} flutuando /> : null}</DragOverlay>
      </DndContext>
    </PageShell>
  );
}

function Indicador({ titulo, valor, subtitulo }: { titulo: string; valor: string; subtitulo: string }) {
  return (
    <GlassCard>
      <p className="text-sm font-semibold text-slate-300">{titulo}</p>
      <p className="mt-2 text-3xl font-black text-white">{valor}</p>
      <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>
    </GlassCard>
  );
}

function ColunaProducao({
  id,
  titulo,
  subtitulo,
  detalhe,
  pedidos,
}: {
  id: StatusProducao;
  titulo: string;
  subtitulo: string;
  detalhe: string;
  pedidos: PedidoCard[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={[
        "min-h-[680px] rounded-3xl border border-white/10 border-t-4 bg-white/[0.04] p-4 transition-all backdrop-blur-xl",
        detalhe,
        isOver ? "scale-[1.01] bg-cyan-400/10 shadow-2xl shadow-cyan-500/20" : "",
      ].join(" ")}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-black text-white">{titulo}</h2>
          <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">{pedidos.length}</span>
      </div>

      <SortableContext items={pedidos.map((pedido) => pedido.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {pedidos.map((pedido) => (
            <CardPedido key={pedido.id} pedido={pedido} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function CardPedido({ pedido, flutuando = false }: { pedido: PedidoCard; flutuando?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pedido.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const corPrioridade = {
    Baixa: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    Média: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    Alta: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    Urgente: "bg-red-500/15 text-red-300 border-red-500/30",
  }[pedido.prioridade];

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={[
        "group rounded-3xl border border-white/10 bg-slate-900/90 p-4 shadow-xl backdrop-blur transition-all",
        "hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-cyan-500/10",
        isDragging ? "opacity-40" : "opacity-100",
        flutuando ? "rotate-2 scale-105 shadow-2xl shadow-cyan-500/20" : "",
      ].join(" ")}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-cyan-400" />
            <h3 className="font-black text-cyan-300">{pedido.numeroPedido}</h3>
            {pedido.status === "finalizado" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <User className="h-3.5 w-3.5" />
            <span>Cliente: {pedido.cliente}</span>
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
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${corPrioridade}`}>{pedido.prioridade}</span>
        {pedido.impressora && (
          <span className="flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-300">
            <Printer className="h-3 w-3" />
            {pedido.impressora}
          </span>
        )}
      </div>

      {typeof pedido.progresso === "number" && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Progresso</span>
            <span>{pedido.progresso}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${pedido.progresso}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-2 rounded-2xl bg-black/20 p-3">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Itens ({pedido.itens.length})</p>
        {pedido.itens.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-white/5 py-2 text-xs last:border-b-0">
            <span className="font-semibold text-slate-100">• {item.descricao}</span>
            <span className="text-slate-400">{item.material}</span>
            <span className="text-slate-300">{item.quantidade} un</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/5 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400"><Clock className="h-3.5 w-3.5" />Tempo</div>
          <p className="mt-1 text-sm font-black text-white">{pedido.tempoEstimado}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400"><Factory className="h-3.5 w-3.5" />Material</div>
          <p className="mt-1 text-sm font-black text-white">{pedido.pesoEstimado}</p>
        </div>
      </div>
    </article>
  );
}
