"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, Edit3, Factory,
  GripVertical, Package, Plus, Printer, Save, Sparkles, Trash2, X,
} from "lucide-react";
import { Feedback, PageShell } from "../_shared";

type StatusProducao = "pedidos" | "fila" | "producao" | "finalizado" | "falha";
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
  clientes: OptionItem[]; impressoras: OptionItem[]; componentes: OptionItem[];
  arquivos3mf: OptionItem[]; filamentos: OptionItem[]; pedidos: OptionItem[];
  execucoes: OptionItem[]; planoProducao: OptionItem[]; estoque?: OptionItem[];
};

type Nomes = {
  pedidos: Map<number, string>; clientes: Map<number, string>;
  impressoras: Map<number, string>; arquivos3mf: Map<number, string>;
};

type FormState = {
  id_pedido: string; id_impressora: string; id_3mf: string;
  tempo_impressao_min: string; status_producao: StatusProducao;
  ordem_fila: string; prioridade: Prioridade; progresso: string; peso_estimado_g: string;
};

type FalhaEmAndamento = {
  idPedido: number; statusAnterior: StatusProducao;
  gramasPerdido: string; tempoPerdido: string; salvando: boolean;
};

const EMPTY_FORM: FormState = {
  id_pedido: "", id_impressora: "", id_3mf: "", tempo_impressao_min: "",
  status_producao: "pedidos", ordem_fila: "", prioridade: "Média",
  progresso: "0", peso_estimado_g: "",
};

const COLUNAS: { id: StatusProducao; titulo: string; subtitulo: string; bordaTopo: string }[] = [
  { id: "pedidos",    titulo: "Pedidos cadastrados", subtitulo: "Ainda nao programados",       bordaTopo: "border-t-cyan-400"    },
  { id: "fila",       titulo: "Fila de producao",    subtitulo: "Ordem planejada",              bordaTopo: "border-t-violet-400"  },
  { id: "producao",   titulo: "Em producao",         subtitulo: "Pecas em execucao agora",      bordaTopo: "border-t-amber-400"   },
  { id: "finalizado", titulo: "Finalizado",          subtitulo: "Pedidos concluidos",           bordaTopo: "border-t-emerald-400" },
  { id: "falha",      titulo: "Falha",               subtitulo: "Impressoes com problema",      bordaTopo: "border-t-red-500"     },
];

function toNum(v: string) { if (v.trim()==="") return null; const n=Number(v); return Number.isNaN(n)?null:n; }

function labelFrom(row: OptionItem|undefined, fields: string[], fallback: string) {
  if (!row) return fallback;
  for (const f of fields) { const v=row[f]; if (v!==null&&v!==undefined&&String(v).trim()!=="") return String(v).trim(); }
  return fallback;
}

function formatTempo(min: number|null|undefined) {
  if (!min) return "--";
  const h=Math.floor(min/60), m=min%60;
  return h<=0?`${m} min`:`${h}h ${String(m).padStart(2,"0")}min`;
}

function apiError(r: unknown) {
  if (typeof r==="object"&&r&&"error" in r) return String((r as {error?:unknown}).error||"Erro desconhecido.");
  return "Erro desconhecido.";
}

function numField(row: OptionItem|undefined, fields: string[]): number|null {
  if (!row) return null;
  for (const f of fields) { const v=row[f]; if (v!==null&&v!==undefined&&String(v).trim()!=="") { const n=Number(v); if (!Number.isNaN(n)) return n; } }
  return null;
}

function calcPeso3mf(opts: OptionsPayload|null, id3mfStr: string) {
  if (!opts||!id3mfStr) return "";
  const id3mf=Number(id3mfStr); if (Number.isNaN(id3mf)) return "";
  const arq=(opts.arquivos3mf||[]).find((i)=>{
    const ids=[numField(i,["id_3mf"]),numField(i,["id"]),numField(i,["id_arquivo_3mf"])].filter((v):v is number=>v!==null);
    return ids.includes(id3mf);
  });
  const idComp=numField(arq,["id_componente_stl","id_componente","componente_id","id_stl"]);
  if (idComp===null) return "";
  const comp=(opts.componentes||[]).find((i)=>{
    const ids=[numField(i,["id_componente_stl"]),numField(i,["id_componente"]),numField(i,["id"])].filter((v):v is number=>v!==null);
    return ids.includes(idComp);
  });
  const peso=numField(comp,["peso_g","peso_estimado_g","peso_componente_g","gramas","peso"]);
  const qtd=numField(arq,["qtd_componente","quantidade_componentes","quantidade","qtd"]);
  if (peso===null||qtd===null) return "";
  return String(Number((peso*qtd).toFixed(3)));
}

function calcPesoPedido(opts: OptionsPayload|null, idPedStr: string) {
  if (!opts||!idPedStr) return "";
  const idPed=Number(idPedStr); if (Number.isNaN(idPed)) return "";
  const ped=(opts.pedidos||[]).find((i)=>Number(i.id_pedido)===idPed);
  const id3mf=numField(ped,["id_3mf","id_arquivo_3mf","id_arquivo"]);
  if (id3mf===null) return "";
  return calcPeso3mf(opts,String(id3mf));
}

export default function PlanoProducaoPage() {
  const [planos,setPlanos]=useState<PlanoProducao[]>([]);
  const [options,setOptions]=useState<OptionsPayload|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [erro,setErro]=useState("");
  const [mensagem,setMensagem]=useState("");
  const [formOpen,setFormOpen]=useState(false);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [form,setForm]=useState<FormState>(EMPTY_FORM);
  const [activePlano,setActivePlano]=useState<PlanoProducao|null>(null);
  const [alertaEstoque,setAlertaEstoque]=useState<{tipo:"ok"|"erro"|"aviso";texto:string}|null>(null);
  const [falhaEmAndamento,setFalhaEmAndamento]=useState<FalhaEmAndamento|null>(null);

  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}));

  async function carregarDados() {
    try {
      setLoading(true); setErro("");
      const [r1,r2,r3]=await Promise.all([
        fetch("/api/plano-producao",{cache:"no-store"}),
        fetch("/api/options",{cache:"no-store"}),
        fetch("/api/estoque",{cache:"no-store"}),
      ]);
      const [d1,d2,d3]=await Promise.all([r1.json(),r2.json(),r3.json()]);
      if (!r1.ok||!d1.ok) throw new Error(apiError(d1));
      if (!r2.ok||!d2.ok) throw new Error(apiError(d2));
      setPlanos(d1.data||[]);
      setOptions({...(d2.data?.[0]||{}),estoque:d3?.ok?d3.data||[]:[]});
    } catch(err) { setErro(err instanceof Error?err.message:"Erro ao carregar plano."); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ carregarDados(); },[]);

  const nomes=useMemo<Nomes>(()=>{
    const pedidos=new Map<number,string>();
    const clientes=new Map<number,string>();
    const impressoras=new Map<number,string>();
    const arquivos3mf=new Map<number,string>();
    for (const i of options?.clientes||[]) clientes.set(Number(i.id_cliente),labelFrom(i,["nome_cliente","cliente","nome"],"Cliente sem nome"));
    for (const i of options?.impressoras||[]) impressoras.set(Number(i.id_impressora),labelFrom(i,["nome_impressora","nome","modelo"],"Impressora sem nome"));
    for (const i of options?.arquivos3mf||[]) arquivos3mf.set(Number(i.id_3mf),labelFrom(i,["nome_arquivo_3mf","nome_arquivo","filename"],"Arquivo 3MF sem nome"));
    for (const i of options?.pedidos||[]) pedidos.set(Number(i.id_pedido),labelFrom(i,["label_pedido","nome_pedido","numero_pedido"],"Pedido cadastrado"));
    return {pedidos,clientes,impressoras,arquivos3mf};
  },[options]);

  function avaliarEstoque(idPedStr:string,id3mfStr?:string) {
    if (!options||!idPedStr) { setAlertaEstoque(null); return; }
    const ped=(options.pedidos||[]).find((i)=>String(i.id_pedido)===idPedStr);
    const id3mf=Number(id3mfStr||ped?.id_3mf||"");
    const arq=(options.arquivos3mf||[]).find((i)=>Number(i.id_3mf)===id3mf);
    if (!arq) { setAlertaEstoque({tipo:"aviso",texto:"Pedido sem Arquivo 3MF — estoque nao validado."}); return; }
    const idComp=numField(arq,["id_componente_stl","id_componente","componente_id"]);
    const qtdComp=numField(arq,["qtd_componente","quantidade_componentes","qtd","quantidade"])||1;
    const comp=(options.componentes||[]).find((i)=>{
      const ids=[numField(i,["id_componente_stl"]),numField(i,["id_componente"]),numField(i,["id"])].filter((v)=>v!==null);
      return idComp!==null&&ids.includes(idComp);
    });
    if (!comp) { setAlertaEstoque({tipo:"aviso",texto:"Componente nao encontrado — estoque nao validado."}); return; }
    const estoqueMap=new Map<number,number>();
    for (const i of options.estoque||[]) {
      const idF=numField(i,["id_filamento"]); const qtd=numField(i,["qtd_estoque_gramas","quantidade","qtd"]);
      if (idF!==null&&qtd!==null) estoqueMap.set(idF,(estoqueMap.get(idF)||0)+qtd);
    }
    const nec:{necessario:number;disponivel:number;label:string}[]=[];
    for (let n=1;n<=8;n++) {
      const idF=numField(comp,[`id_filamento${n}`,`id_filamento_${n}`]);
      const g=numField(comp,[`gramas_filamento_${n}`,`gramas_filamento${n}`]);
      if (idF===null||g===null||g<=0) continue;
      const fil=(options.filamentos||[]).find((i)=>Number(i.id_filamento)===idF);
      nec.push({necessario:Number((g*qtdComp).toFixed(3)),disponivel:Number((estoqueMap.get(idF)||0).toFixed(3)),label:labelFrom(fil,["nome_filamento","nome"],`Filamento ${idF}`)});
    }
    if (!nec.length) { setAlertaEstoque({tipo:"aviso",texto:"Nenhum consumo cadastrado para o componente."}); return; }
    const resumo=nec.map((n)=>`${n.label}: ${n.necessario}g / ${n.disponivel}g disponivel`).join(" | ");
    const faltante=nec.some((n)=>n.disponivel<n.necessario);
    setAlertaEstoque(faltante?{tipo:"erro",texto:`Estoque insuficiente. ${resumo}`}:{tipo:"ok",texto:`Estoque suficiente. ${resumo}`});
  }

  function sugerirImpressora() {
    const lista=options?.impressoras||[];
    if (!lista.length) { setErro("Nenhuma impressora cadastrada."); return; }
    const emUso=new Set(planos.filter((p)=>p.status_producao==="producao"&&p.id_impressora).map((p)=>Number(p.id_impressora)));
    const livre=lista.find((i)=>!emUso.has(Number(i.id_impressora)))||lista[0];
    setForm((f)=>({...f,id_impressora:String(livre.id_impressora)}));
    setMensagem(`Impressora sugerida: ${labelFrom(livre,["nome_impressora","nome","modelo"],"Impressora sem nome")}.`);
  }

  function novoPlano() { setEditingId(null); setForm(EMPTY_FORM); setFormOpen(true); setMensagem(""); setErro(""); setAlertaEstoque(null); }

  function editarPlano(plano:PlanoProducao) {
    setEditingId(plano.id_pedido);
    setForm({
      id_pedido:String(plano.id_pedido??""), id_impressora:String(plano.id_impressora??""),
      id_3mf:String(plano.id_3mf??""), tempo_impressao_min:String(plano.tempo_impressao_min??""),
      status_producao:plano.status_producao||"pedidos", ordem_fila:String(plano.ordem_fila??""),
      prioridade:plano.prioridade||"Média", progresso:String(plano.progresso??0),
      peso_estimado_g:String(plano.peso_estimado_g??""),
    });
    setFormOpen(true); setMensagem(""); setErro("");
  }

  async function salvarPlano(event:React.FormEvent) {
    event.preventDefault();
    try {
      setSaving(true); setErro(""); setMensagem("");
      const ped=(options?.pedidos||[]).find((p)=>String(p.id_pedido)===form.id_pedido);
      const id3mfFinal=form.id_3mf||(ped?.id_3mf?String(ped.id_3mf):"");
      const payload={
        id_pedido:toNum(form.id_pedido), id_impressora:toNum(form.id_impressora),
        id_3mf:toNum(id3mfFinal), tempo_impressao_min:toNum(form.tempo_impressao_min),
        status_producao:form.status_producao, ordem_fila:toNum(form.ordem_fila),
        prioridade:form.prioridade, progresso:toNum(form.progresso),
        peso_estimado_g:toNum(form.peso_estimado_g),
      };
      const res=await fetch("/api/plano-producao",{method:editingId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const result=await res.json();
      if (!res.ok||!result.ok) throw new Error(apiError(result));
      setMensagem(editingId?"Plano atualizado.":"Pedido adicionado ao plano.");
      setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM);
      await carregarDados();
    } catch(err) { setErro(err instanceof Error?err.message:"Erro ao salvar."); }
    finally { setSaving(false); }
  }

  async function excluirPlano(idPedido:number) {
    if (!window.confirm("Excluir este pedido do plano de producao?")) return;
    try {
      setErro(""); setMensagem("");
      const res=await fetch(`/api/plano-producao?id=${idPedido}`,{method:"DELETE"});
      const result=await res.json();
      if (!res.ok||!result.ok) throw new Error(apiError(result));
      setMensagem("Pedido removido do plano."); await carregarDados();
    } catch(err) { setErro(err instanceof Error?err.message:"Erro ao excluir."); }
  }

  function handleDragStart(event:DragStartEvent) {
    const plano=planos.find((p)=>String(p.id_pedido)===String(event.active.id));
    if (plano) setActivePlano(plano);
  }

  async function handleDragEnd(event:DragEndEvent) {
    const {active,over}=event; setActivePlano(null);
    if (!over) return;
    const idPedido=Number(active.id);
    const destino=String(over.id) as StatusProducao;
    if (!COLUNAS.some((c)=>c.id===destino)) return;
    const planoAtual=planos.find((p)=>p.id_pedido===idPedido);
    if (!planoAtual||planoAtual.status_producao===destino) return;

    if (destino==="falha") {
      setPlanos((prev)=>prev.map((p)=>p.id_pedido===idPedido?{...p,status_producao:"falha"}:p));
      setFalhaEmAndamento({idPedido,statusAnterior:planoAtual.status_producao||"pedidos",gramasPerdido:"",tempoPerdido:"",salvando:false});
      return;
    }

    const backup=planos;
    setPlanos((prev)=>prev.map((p)=>p.id_pedido===idPedido?{...p,status_producao:destino,progresso:destino==="finalizado"?100:destino==="producao"?p.progresso||1:p.progresso||0}:p));
    const res=await fetch("/api/plano-producao",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...planoAtual,status_producao:destino,progresso:destino==="finalizado"?100:planoAtual.progresso||0})});
    const result=await res.json();
    if (!res.ok||!result.ok) { setPlanos(backup); setErro(apiError(result)); return; }

    // Debita estoque ao finalizar
    if (destino==="finalizado" && planoAtual.id_3mf) {
      const rd=await fetch("/api/estoque-debito",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id_3mf:planoAtual.id_3mf})});
      const dd=await rd.json();
      if (!rd.ok||!dd.ok) setErro(`Aviso: pedido finalizado mas erro ao debitar estoque — ${dd.error}`);
    }
  }

  async function confirmarFalha() {
    if (!falhaEmAndamento) return;

    // Snapshot imutável — evita perda de referência após setState
    const snap = { ...falhaEmAndamento };
    const planoAtual = planos.find((p) => p.id_pedido === snap.idPedido);

    // 1. Marca como salvando e garante card na coluna falha ANTES das chamadas async
    setFalhaEmAndamento((prev) => prev ? { ...prev, salvando: true } : null);
    setPlanos((prev) =>
      prev.map((p) => p.id_pedido === snap.idPedido ? { ...p, status_producao: "falha" } : p)
    );

    try {
      // 2. Persiste status_producao = 'falha' no banco
      const r1 = await fetch("/api/plano-producao", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...planoAtual, status_producao: "falha" }),
      });
      const d1 = await r1.json();
      if (!r1.ok || !d1.ok) throw new Error(apiError(d1));

      // 3. Grava registro em falhas_producao
      const r2 = await fetch("/api/falhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_3mf: planoAtual?.id_3mf ?? null,
          tempo_impressao_min_perdido: snap.tempoPerdido ? Number(snap.tempoPerdido) : null,
          quant_mat_perdido: snap.gramasPerdido ? Number(snap.gramasPerdido) : null,
        }),
      });
      const d2 = await r2.json();
      if (!r2.ok || !d2.ok) throw new Error(apiError(d2));

      // 4. Debita material perdido no estoque (filamento principal do componente)
      if (snap.gramasPerdido && planoAtual?.id_3mf) {
        // Descobre o filamento principal via 3MF → componente → id_filamento1
        const arqRes = await fetch(`/api/options`);
        const arqData = await arqRes.json();
        const opts = arqData?.data?.[0] as { arquivos3mf?: Record<string,unknown>[]; componentes?: Record<string,unknown>[] } | undefined;
        const arq3mf = (opts?.arquivos3mf||[]).find((a) => Number(a.id_3mf) === planoAtual.id_3mf);
        const idComp = arq3mf ? Number(arq3mf.id_componente_stl) : null;
        const comp   = idComp ? (opts?.componentes||[]).find((c) => Number(c.id_componente_stl) === idComp) : null;
        const idFil1 = comp ? Number(comp.id_filamento1) : null;
        if (idFil1) {
          const rd = await fetch("/api/estoque-debito", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_filamento: idFil1, gramas: Number(snap.gramasPerdido) }),
          });
          const dd = await rd.json();
          if (!rd.ok || !dd.ok) console.warn("Aviso: falha registrada mas erro ao debitar estoque:", dd.error);
        }
      }

      // 5. Sucesso — fecha modal, mantém card em falha (já setado no passo 1)
      setFalhaEmAndamento(null);
      setMensagem("Falha registrada com sucesso.");
    } catch (err) {
      // Revert: volta card para coluna anterior apenas se houve erro
      setPlanos((prev) =>
        prev.map((p) => p.id_pedido === snap.idPedido ? { ...p, status_producao: snap.statusAnterior } : p)
      );
      setErro(err instanceof Error ? err.message : "Erro ao registrar falha.");
      setFalhaEmAndamento(null);
    }
  }

  function cancelarFalha() {
    if (!falhaEmAndamento) return;
    setPlanos((prev)=>prev.map((p)=>p.id_pedido===falhaEmAndamento.idPedido?{...p,status_producao:falhaEmAndamento.statusAnterior}:p));
    setFalhaEmAndamento(null);
  }

  const total=planos.length;
  const naFila=planos.filter((p)=>(p.status_producao||"pedidos")==="fila").length;
  const produzindo=planos.filter((p)=>(p.status_producao||"pedidos")==="producao").length;
  const finalizados=planos.filter((p)=>(p.status_producao||"pedidos")==="finalizado").length;
  const comFalha=planos.filter((p)=>(p.status_producao||"pedidos")==="falha").length;

  return (
    <PageShell title="Plano de Producao" description="Fila visual de producao. Arraste os cards entre colunas para atualizar o status.">
      <Feedback erro={erro} mensagem={mensagem} />

      <div className="grid gap-3 md:grid-cols-5">
        <Indicador titulo="Total"       valor={total}       subtitulo="No plano"        />
        <Indicador titulo="Na fila"     valor={naFila}      subtitulo="Aguardando"      />
        <Indicador titulo="Produzindo"  valor={produzindo}  subtitulo="Em execucao"     />
        <Indicador titulo="Finalizados" valor={finalizados} subtitulo="Concluidos"      />
        <Indicador titulo="Falhas"      valor={comFalha}    subtitulo="Com problema" vermelho={comFalha>0} />
      </div>

      <div className="flex justify-end">
        <button onClick={novoPlano} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300">
          <Plus className="h-4 w-4" /> Adicionar pedido ao plano
        </button>
      </div>

      {formOpen && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">{editingId?"Editar plano de producao":"Adicionar pedido ao plano"}</h2>
              <p className="mt-1 text-sm text-slate-400">Selecione o pedido ja cadastrado e defina a impressora somente aqui.</p>
            </div>
            <button onClick={()=>setFormOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={salvarPlano} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Pedido">
              <select value={form.id_pedido} disabled={Boolean(editingId)} required className="field"
                onChange={(e)=>{
                  const ped=(options?.pedidos||[]).find((p)=>String(p.id_pedido)===e.target.value);
                  const id3mf=ped?.id_3mf?String(ped.id_3mf):"";
                  const peso=id3mf?calcPeso3mf(options,id3mf):calcPesoPedido(options,e.target.value);
                  setForm((f)=>({...f,id_pedido:e.target.value,id_3mf:id3mf||f.id_3mf,peso_estimado_g:peso}));
                  avaliarEstoque(e.target.value,id3mf||undefined);
                }}>
                <option value="">Selecione</option>
                {(options?.pedidos||[]).map((p)=>(<option key={String(p.id_pedido)} value={String(p.id_pedido)}>{labelFrom(p,["label_pedido","nome_pedido","numero_pedido"],"Pedido cadastrado")}</option>))}
              </select>
            </Field>

            <Field label="Impressora">
              <div className="flex gap-2">
                <select value={form.id_impressora} onChange={(e)=>setForm((f)=>({...f,id_impressora:e.target.value}))} className="field">
                  <option value="">Selecione</option>
                  {(options?.impressoras||[]).map((imp)=>(<option key={String(imp.id_impressora)} value={String(imp.id_impressora)}>{labelFrom(imp,["nome_impressora","nome","modelo"],"Impressora sem nome")}</option>))}
                </select>
                <button type="button" onClick={sugerirImpressora} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 text-cyan-300 hover:bg-cyan-400/20" title="Sugerir impressora">
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </Field>

            <Field label="Arquivo 3MF">
              <select value={form.id_3mf} onChange={(e)=>setForm((f)=>({...f,id_3mf:e.target.value}))} className="field">
                <option value="">Selecione</option>
                {(options?.arquivos3mf||[]).map((a)=>(<option key={String(a.id_3mf)} value={String(a.id_3mf)}>{labelFrom(a,["nome_arquivo_3mf","nome_arquivo","filename"],"Arquivo 3MF sem nome")}</option>))}
              </select>
            </Field>

            <Field label="Status">
              <select value={form.status_producao} onChange={(e)=>setForm((f)=>({...f,status_producao:e.target.value as StatusProducao}))} className="field">
                <option value="pedidos">Pedidos cadastrados</option>
                <option value="fila">Fila</option>
                <option value="producao">Em producao</option>
                <option value="finalizado">Finalizado</option>
                <option value="falha">Falha</option>
              </select>
            </Field>

            <Field label="Prioridade">
              <select value={form.prioridade} onChange={(e)=>setForm((f)=>({...f,prioridade:e.target.value as Prioridade}))} className="field">
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </Field>

            <Field label="Tempo de impressao (min)">
              <input value={form.tempo_impressao_min} onChange={(e)=>setForm((f)=>({...f,tempo_impressao_min:e.target.value}))} type="number" min="0" className="field" />
            </Field>

            <Field label="Ordem da fila">
              <input value={form.ordem_fila} onChange={(e)=>setForm((f)=>({...f,ordem_fila:e.target.value}))} type="number" min="0" className="field" />
            </Field>

            <Field label="Progresso (%)">
              <input value={form.progresso} onChange={(e)=>setForm((f)=>({...f,progresso:e.target.value}))} type="number" min="0" max="100" className="field" />
            </Field>

            <Field label="Peso estimado (g)">
              <input value={form.peso_estimado_g} onChange={(e)=>setForm((f)=>({...f,peso_estimado_g:e.target.value}))} type="number" min="0" step="0.001" placeholder="Calculado automaticamente" className="field" />
            </Field>

            {alertaEstoque && (
              <div className={`xl:col-span-4 rounded-2xl border px-4 py-3 text-sm font-medium flex items-start gap-3 ${alertaEstoque.tipo==="ok"?"border-emerald-500/30 bg-emerald-500/10 text-emerald-300":alertaEstoque.tipo==="erro"?"border-red-500/30 bg-red-500/10 text-red-300":"border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
                <span className="mt-0.5 text-lg leading-none">{alertaEstoque.tipo==="ok"?"✅":alertaEstoque.tipo==="erro"?"🚫":"⚠️"}</span>
                <span>{alertaEstoque.texto}</span>
              </div>
            )}

            <div className="flex items-end gap-3 xl:col-span-4">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
                <Save className="h-4 w-4" />{saving?"Salvando...":"Salvar"}
              </button>
              <button type="button" onClick={()=>setFormOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/10">Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] py-12 text-center text-sm text-slate-400">Carregando plano de producao...</div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <section className="flex gap-5 overflow-x-auto pb-4">
            {COLUNAS.map((coluna)=>{
              const planosDaColuna=planos.filter((p)=>(p.status_producao||"pedidos")===coluna.id);
              return (
                <ColunaProducao key={coluna.id} coluna={coluna} planos={planosDaColuna} nomes={nomes}
                  falhaEmAndamento={falhaEmAndamento}
                  onFalhaChange={(field,value)=>setFalhaEmAndamento((prev)=>prev?{...prev,[field]:value}:null)}
                  onFalhaConfirm={confirmarFalha} onFalhaCancel={cancelarFalha}
                  onEdit={editarPlano} onDelete={excluirPlano} />
              );
            })}
          </section>
          <DragOverlay>{activePlano?<CardPlano plano={activePlano} nomes={nomes} flutuando />:null}</DragOverlay>
        </DndContext>
      )}

      <style jsx global>{`
        .field { width:100%; border-radius:0.75rem; border:1px solid rgba(255,255,255,0.1); background:rgba(2,6,23,0.75); padding:0.625rem 0.75rem; color:white; outline:none; }
        .field:focus { border-color:rgb(34,211,238); }
      `}</style>
    </PageShell>
  );
}

function Field({label,children}:{label:string;children:React.ReactNode}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Indicador({titulo,valor,subtitulo,vermelho=false}:{titulo:string;valor:number;subtitulo:string;vermelho?:boolean}) {
  return (
    <div className={`rounded-3xl border p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition-colors ${vermelho&&valor>0?"border-red-500/30 bg-red-500/10":"border-white/10 bg-white/[0.045]"}`}>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{titulo}</p>
      <p className={`mt-2 text-3xl font-black ${vermelho&&valor>0?"text-red-300":"text-white"}`}>{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitulo}</p>
    </div>
  );
}

function ColunaProducao({coluna,planos,nomes,falhaEmAndamento,onFalhaChange,onFalhaConfirm,onFalhaCancel,onEdit,onDelete}:{
  coluna:{id:StatusProducao;titulo:string;subtitulo:string;bordaTopo:string};
  planos:PlanoProducao[]; nomes:Nomes; falhaEmAndamento:FalhaEmAndamento|null;
  onFalhaChange:(field:"gramasPerdido"|"tempoPerdido",value:string)=>void;
  onFalhaConfirm:()=>void; onFalhaCancel:()=>void;
  onEdit:(plano:PlanoProducao)=>void; onDelete:(idPedido:number)=>void;
}) {
  const {setNodeRef,isOver}=useDroppable({id:coluna.id});
  const isFalhaCol=coluna.id==="falha";
  return (
    <div ref={setNodeRef} className={`min-h-[640px] w-[360px] shrink-0 rounded-3xl border border-t-4 ${coluna.bordaTopo} p-4 transition-all ${isFalhaCol?isOver?"border-red-500/50 bg-red-500/10 shadow-2xl shadow-red-500/20":"border-red-500/20 bg-red-500/[0.04]":isOver?"border-white/20 bg-cyan-400/10 shadow-2xl shadow-cyan-500/20":"border-white/10 bg-white/[0.04]"}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className={`text-lg font-black ${isFalhaCol?"text-red-300":"text-white"}`}>{coluna.titulo}</h2>
          <p className="mt-1 text-xs text-slate-400">{coluna.subtitulo}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">{planos.length}</span>
      </div>
      {isFalhaCol&&planos.length===0&&!isOver&&(
        <div className="mb-3 rounded-2xl border border-dashed border-red-500/30 px-4 py-3 text-center text-xs text-red-400/60">Arraste um card aqui para registrar uma falha</div>
      )}
      <SortableContext items={planos.map((p)=>String(p.id_pedido))} strategy={verticalListSortingStrategy}>
        <div className="max-h-[calc(100vh-360px)] space-y-4 overflow-y-auto pr-1">
          {planos.map((plano)=>(
            <CardPlano key={plano.id_pedido} plano={plano} nomes={nomes}
              falhaEmAndamento={falhaEmAndamento?.idPedido===plano.id_pedido?falhaEmAndamento:null}
              onFalhaChange={onFalhaChange} onFalhaConfirm={onFalhaConfirm} onFalhaCancel={onFalhaCancel}
              onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function CardPlano({plano,nomes,flutuando=false,falhaEmAndamento,onFalhaChange,onFalhaConfirm,onFalhaCancel,onEdit,onDelete}:{
  plano:PlanoProducao; nomes:Nomes; flutuando?:boolean; falhaEmAndamento?:FalhaEmAndamento|null;
  onFalhaChange?:(field:"gramasPerdido"|"tempoPerdido",value:string)=>void;
  onFalhaConfirm?:()=>void; onFalhaCancel?:()=>void;
  onEdit?:(plano:PlanoProducao)=>void; onDelete?:(idPedido:number)=>void;
}) {
  const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:String(plano.id_pedido)});
  const style={transform:CSS.Transform.toString(transform),transition};
  const prioridade=plano.prioridade||"Média";
  const progresso=plano.progresso??0;
  const isFalha=plano.status_producao==="falha";
  const aguardaForm=!!falhaEmAndamento;

  // Card começa colapsado; expande ao clicar no chevron
  const [expandido,setExpandido]=useState(false);

  const corPrioridade:Record<string,string>={
    Baixa:"border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    Media:"border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
    Média:"border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
    Alta:"border-orange-500/30 bg-orange-500/15 text-orange-300",
    Urgente:"border-red-500/30 bg-red-500/15 text-red-300",
  };

  // Quando o modal de falha abre, força expansão para mostrar os campos
  const deveExpandir = expandido || aguardaForm || flutuando;

  return (
    <article ref={setNodeRef} style={style}
      className={`rounded-2xl border shadow-lg backdrop-blur transition-all ${isFalha?"border-red-500/30 bg-red-950/60":"border-white/10 bg-slate-900/90"} ${isDragging?"opacity-40":"opacity-100"} ${flutuando?"rotate-2 scale-105 shadow-2xl shadow-cyan-500/20":""}`}>

      {/* ── Linha colapsada (sempre visível) ── */}
      <div className="flex items-center gap-2 px-3 py-2">

        {/* Drag handle */}
        {!aguardaForm&&(
          <button className="cursor-grab shrink-0 rounded-lg bg-white/5 p-1 text-slate-500 active:cursor-grabbing hover:text-slate-300 hover:bg-white/10 transition-colors" {...attributes} {...listeners}>
            <GripVertical className="h-3.5 w-3.5"/>
          </button>
        )}

        {/* Ícone de status */}
        <span className="shrink-0">
          {isFalha
            ? <AlertTriangle className="h-3.5 w-3.5 text-red-400"/>
            : <Package className="h-3.5 w-3.5 text-cyan-400"/>}
        </span>

        {/* Nome do pedido */}
        <span className={`flex-1 truncate text-sm font-black ${isFalha?"text-red-200":"text-white"}`}>
          {nomes.pedidos.get(Number(plano.id_pedido))||`Pedido ${plano.id_pedido}`}
        </span>

        {/* Badge de prioridade (sempre visível, compacto) */}
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${corPrioridade[prioridade]||corPrioridade["Média"]}`}>
          {prioridade}
        </span>

        {/* Barra de progresso mini (somente se não for falha) */}
        {!isFalha&&(
          <div className="hidden sm:flex shrink-0 items-center gap-1">
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-400" style={{width:`${Math.min(Math.max(progresso,0),100)}%`}}/>
            </div>
            <span className="text-[10px] text-slate-500">{progresso}%</span>
          </div>
        )}

        {/* Botão expandir/colapsar */}
        {!aguardaForm&&(
          <button
            onClick={()=>setExpandido((v)=>!v)}
            className="shrink-0 rounded-lg bg-white/5 p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors"
            title={expandido?"Colapsar":"Expandir"}
          >
            {expandido
              ? <ChevronUp className="h-3.5 w-3.5"/>
              : <ChevronDown className="h-3.5 w-3.5"/>}
          </button>
        )}
      </div>

      {/* ── Conteúdo expandido ── */}
      {deveExpandir&&(
        <>
          <div className="border-t border-white/5 px-3 pb-3 pt-3 space-y-3">

            {/* Impressora */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Printer className="h-3.5 w-3.5 shrink-0"/>
              <span>{plano.id_impressora?nomes.impressoras.get(Number(plano.id_impressora)):"Impressora nao definida"}</span>
            </div>

            {/* Badges de status especiais */}
            <div className="flex flex-wrap gap-2">
              {plano.status_producao==="finalizado"&&(
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-3 w-3"/> Concluido
                </span>
              )}
              {isFalha&&!aguardaForm&&(
                <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-xs font-bold text-red-300">
                  <AlertTriangle className="h-3 w-3"/> Falha registrada
                </span>
              )}
            </div>

            {/* Detalhes: 3MF + Tempo */}
            <div className="space-y-1.5 rounded-xl bg-black/20 px-3 py-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Factory className="h-3.5 w-3.5 shrink-0 text-violet-300"/>
                <span className="truncate">{plano.id_3mf?nomes.arquivos3mf.get(Number(plano.id_3mf)):"Arquivo 3MF nao definido"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-cyan-300"/>
                <span>{formatTempo(plano.tempo_impressao_min)}</span>
              </div>
            </div>

            {/* Barra de progresso completa */}
            {!isFalha&&(
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Progresso</span><span>{progresso}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-400 transition-all" style={{width:`${Math.min(Math.max(progresso,0),100)}%`}}/>
                </div>
              </div>
            )}
          </div>

          {/* ── Modal inline de falha ── */}
          {aguardaForm&&falhaEmAndamento&&(
            <div className="mx-3 mb-3 rounded-xl border border-red-500/40 bg-black/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400"/>
                <p className="text-xs font-black text-red-300">Registrar detalhes da falha</p>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-red-300/80">Material perdido (g) *</label>
                  <input type="number" min="0" step="0.1" value={falhaEmAndamento.gramasPerdido}
                    onChange={(e)=>onFalhaChange?.("gramasPerdido",e.target.value)}
                    placeholder="Ex.: 45.5"
                    className="w-full rounded-lg border border-red-500/30 bg-slate-950/80 px-3 py-1.5 text-xs text-white outline-none focus:border-red-400 placeholder:text-slate-600"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-red-300/80">Tempo perdido (min) *</label>
                  <input type="number" min="0" value={falhaEmAndamento.tempoPerdido}
                    onChange={(e)=>onFalhaChange?.("tempoPerdido",e.target.value)}
                    placeholder="Ex.: 120"
                    className="w-full rounded-lg border border-red-500/30 bg-slate-950/80 px-3 py-1.5 text-xs text-white outline-none focus:border-red-400 placeholder:text-slate-600"/>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={onFalhaConfirm}
                  disabled={falhaEmAndamento.salvando||!falhaEmAndamento.gramasPerdido||!falhaEmAndamento.tempoPerdido}
                  className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-black text-white hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed">
                  {falhaEmAndamento.salvando?"Salvando...":"Confirmar falha"}
                </button>
                <button onClick={onFalhaCancel} disabled={falhaEmAndamento.salvando}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Botoes editar/excluir */}
          {!flutuando&&!aguardaForm&&(
            <div className="mx-3 mb-3 flex gap-2">
              <button onClick={()=>onEdit?.(plano)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20">
                <Edit3 className="h-3 w-3"/> Editar
              </button>
              <button onClick={()=>onDelete?.(plano.id_pedido)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-400/30 bg-red-400/10 px-2 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/20">
                <Trash2 className="h-3 w-3"/> Excluir
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
