"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Edit3, Factory,
  GripVertical, Package, Plus, Printer, Save, Sparkles, Trash2, X,
} from "lucide-react";
import { Feedback, PageShell , useAuthGuard } from "../_shared";

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
  stls_concluidos?: number[] | null;
};

type OptionsPayload = {
  clientes: OptionItem[]; impressoras: OptionItem[]; componentes: OptionItem[];
  arquivos3mf: OptionItem[]; filamentos: OptionItem[]; pedidos: OptionItem[];
  execucoes: OptionItem[]; planoProducao: OptionItem[]; estoque?: OptionItem[];
  pedido3mfs?: OptionItem[]; compImpressoras?: OptionItem[];
  fabricantesFilamentos?: OptionItem[];
};

type Nomes = {
  pedidos: Map<number, string>; clientes: Map<number, string>;
  impressoras: Map<number, string>; arquivos3mf: Map<number, string>;
  pedido3mfs: Map<number, number[]>;
};

type FormState = {
  id_pedido: string; id_impressora: string;
  tempo_impressao_min: string; status_producao: StatusProducao;
  ordem_fila: string; prioridade: Prioridade; progresso: string; peso_estimado_g: string;
};

type FalhaEmAndamento = {
  idPedido: number; statusAnterior: StatusProducao;
  gramasPerdido: string; tempoPerdido: string; salvando: boolean;
};

type SlotFilamento = {
  idFilamento: number;
  nomeFilamento: string;
  nomeStl: string;
  gramas: number;           // gramas totais da peça (referência)
  gramasPerdido: string;    // gramas efetivamente perdidas (digitado pelo usuário)
  idEstoqueEscolhido: string;
};

type FinalizacaoEmAndamento = {
  idPedido: number;
  statusAnterior: StatusProducao;
  slots: SlotFilamento[];
  salvando: boolean;
};

type FalhaCarretelEmAndamento = {
  idPedido: number;
  statusAnterior: StatusProducao;
  slots: SlotFilamento[];  // cada slot tem gramasPerdido individual
  tempoPerdido: string;    // tempo total perdido
  salvando: boolean;
};

const EMPTY_FORM: FormState = {
  id_pedido: "", id_impressora: "", tempo_impressao_min: "",
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
  useAuthGuard();
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
  const [alertaEstoque,setAlertaEstoque]=useState<{tipo:"ok"|"erro"|"aviso";texto:string;itens?:{label:string;necessario:number;disponivel:number;localizacao:string;ok:boolean}[]}|null>(null);
  const [falhaEmAndamento,setFalhaEmAndamento]=useState<FalhaEmAndamento|null>(null);
  // Modal de sugestão de impressora ao selecionar pedido
  const [sugestaoImp,setSugestaoImp]=useState<{idImpressora:number;nomeImpressora:string;tempoMin:number}|null>(null);
  const [falhaCarretelEmAndamento,setFalhaCarretelEmAndamento]=useState<FalhaCarretelEmAndamento|null>(null);
  const [finalizacaoEmAndamento,setFinalizacaoEmAndamento]=useState<FinalizacaoEmAndamento|null>(null);

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
    for (const i of options?.arquivos3mf||[]) { const id=Number(i.id_3mf); if(!arquivos3mf.has(id)) arquivos3mf.set(id,labelFrom(i,["nome_arquivo_3mf","nome_arquivo","filename"],"Arquivo 3MF sem nome")); }
    const pedido3mfs=new Map<number,number[]>();
    for (const i of options?.pedido3mfs||[]) {
      const idPed=Number(i.id_pedido); const id3mf=Number(i.id_3mf);
      if(!pedido3mfs.has(idPed)) pedido3mfs.set(idPed,[]);
      pedido3mfs.get(idPed)!.push(id3mf);
    }
    for (const i of options?.pedidos||[]) pedidos.set(Number(i.id_pedido),labelFrom(i,["label_pedido","nome_pedido","numero_pedido"],"Pedido cadastrado"));
    return {pedidos,clientes,impressoras,arquivos3mf,pedido3mfs};
  },[options]);

  function avaliarEstoque(idPedStr:string,id3mfStr?:string) {
    if (!options||!idPedStr) { setAlertaEstoque(null); return; }
    const ped=(options.pedidos||[]).find((i)=>String(i.id_pedido)===idPedStr);
    const id3mfStr2=id3mfStr||String(ped?.id_3mf||"");
    const ids3mfPed=(nomes.pedido3mfs.get(Number(idPedStr))||[]);
    const ids3mfAvalia = ids3mfPed.length>0 ? ids3mfPed :
      (id3mfStr2 ? [Number(id3mfStr2)] : []);

    // Busca TODAS as linhas de TODOS os 3MFs do pedido
    const linhas3mf=(options.arquivos3mf||[]).filter((i)=>ids3mfAvalia.includes(Number(i.id_3mf)));
    if (!linhas3mf.length) { setAlertaEstoque({tipo:"aviso",texto:"Pedido sem Arquivo 3MF — estoque nao validado."}); return; }


    // Monta lista de carreteis individuais por id_filamento
    const carreteisPorFil=new Map<number,{qtd:number;localizacao:string}[]>();
    for (const i of options.estoque||[]) {
      const idF=numField(i,["id_filamento"]);
      const qtd=numField(i,["qtd_estoque_gramas","quantidade","qtd"]);
      const loc=String(i.localizacao??"");
      if (idF!==null&&qtd!==null) {
        if (!carreteisPorFil.has(idF)) carreteisPorFil.set(idF,[]);
        carreteisPorFil.get(idF)!.push({qtd:Number(qtd),localizacao:loc});
      }
    }

    // Acumula necessidade de cada filamento somando todos os STLs
    const necMap=new Map<number,{necessario:number;label:string}>();
    for (const arq of linhas3mf) {
      const idComp=numField(arq,["id_componente_stl","id_componente","componente_id"]);
      const qtdComp=numField(arq,["qtd_componente","quantidade_componentes","qtd","quantidade"])||1;
      const comp=(options.componentes||[]).find((i)=>{
        const ids=[numField(i,["id_componente_stl"]),numField(i,["id_componente"]),numField(i,["id"])].filter((v)=>v!==null);
        return idComp!==null&&ids.includes(idComp);
      });
      if (!comp) continue;
      for (let n=1;n<=8;n++) {
        const idF=numField(comp,[`id_filamento${n}`,`id_filamento_${n}`]);
        const g=numField(comp,[`gramas_filamento_${n}`,`gramas_filamento${n}`]);
        if (idF===null||g===null||g<=0) continue;
        const fil=(options.filamentos||[]).find((i)=>Number(i.id_filamento)===idF);
        const nomeFil=fil?String(fil.nome_filamento??`Filamento ${idF}`):`Filamento ${idF}`;
        const corFil=fil?.cor_filamento?` · ${String(fil.cor_filamento)}`:"";
        const idFab=fil?.id_fabricante_filamento;
        const fabRow=idFab?(options.fabricantesFilamentos||[]).find((x)=>Number(x.id_fabricante_filamento)===Number(idFab)):null;
        const fabFil=fabRow?` · ${String(fabRow.nome_fabricante??"")}`:""
        const label=`${nomeFil}${corFil}${fabFil}`;
        const totalNec=Number((g*qtdComp).toFixed(3));
        const prev=necMap.get(idF);
        necMap.set(idF,{necessario:Number(((prev?.necessario||0)+totalNec).toFixed(3)),label});
      }
    }

    const nec=[...necMap.entries()];
    if (!nec.length) { setAlertaEstoque({tipo:"aviso",texto:"Nenhum consumo cadastrado para o componente."}); return; }

    // Para cada filamento escolhe o melhor carretel individual:
    // menor qtd que atende (otimiza uso) ou maior disponível (se nenhum atende)
    const itens=nec.map(([idF,{necessario,label}])=>{
      const carreteis=(carreteisPorFil.get(idF)||[]).sort((a,b)=>a.qtd-b.qtd);
      const suficientes=carreteis.filter(c=>c.qtd>=necessario);
      const escolhido=suficientes.length>0
        ? suficientes[0]
        : carreteis.length>0 ? carreteis[carreteis.length-1]
        : {qtd:0,localizacao:""};
      return {
        label,
        necessario,
        disponivel:Number(escolhido.qtd.toFixed(3)),
        localizacao:escolhido.localizacao,
        ok:escolhido.qtd>=necessario,
      };
    });
    const faltante=itens.some((i)=>!i.ok);
    setAlertaEstoque({tipo:faltante?"erro":"ok",texto:faltante?"Estoque insuficiente":"Estoque suficiente",itens});
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
      tempo_impressao_min:String(plano.tempo_impressao_min??""),
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
      // id_3mf = primeiro 3MF do pedido (para compatibilidade com banco)
      const ids3mfSave=nomes.pedido3mfs.get(Number(form.id_pedido))||[];
      const id3mfFinal=ids3mfSave.length>0?ids3mfSave[0]:0;
      // Calcula tempo automaticamente a partir dos STLs se não informado
      let tempoAutoMin=toNum(form.tempo_impressao_min);
      if (!tempoAutoMin && options) {
        const linhasAutoCalc=(options.arquivos3mf||[]).filter((a)=>ids3mfSave.includes(Number(a.id_3mf)));
        let tot=0;
        for (const l of linhasAutoCalc) {
          const c=(options.componentes||[]).find((x)=>Number(x.id_componente_stl)===Number(l.id_componente_stl));
          if (c) tot+=Number((c as Record<string,unknown>).tempo_impressao_min||0)*Number(l.qtd_componente||1);
        }
        if (tot>0) tempoAutoMin=tot;
      }
      const payload={
        id_pedido:toNum(form.id_pedido), id_impressora:toNum(form.id_impressora),
        id_3mf:id3mfFinal, tempo_impressao_min:tempoAutoMin,
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

  const ORDEM_COLUNAS: StatusProducao[] = ["pedidos","fila","producao","finalizado","falha"];

  async function moverPlano(idPedido: number, direcao: "avancar" | "recuar") {
    const planoAtual = planos.find((p) => p.id_pedido === idPedido);
    if (!planoAtual) return;
    const statusAtual = planoAtual.status_producao || "pedidos";
    const idxAtual = ORDEM_COLUNAS.indexOf(statusAtual as StatusProducao);
    const idxNovo  = direcao === "avancar" ? idxAtual + 1 : idxAtual - 1;
    if (idxNovo < 0 || idxNovo >= ORDEM_COLUNAS.length) return;
    const novoStatus = ORDEM_COLUNAS[idxNovo];

    // Ao avançar para finalizado, abre o modal de seleção de carreteis
    const ids3mfMover = nomes.pedido3mfs.get(Number(idPedido)) || (planoAtual.id_3mf?[Number(planoAtual.id_3mf)]:[]);
    if (novoStatus === "finalizado" && ids3mfMover.length > 0 && options) {
      const fakeEvent = { active: { id: String(idPedido) }, over: { id: "finalizado" } };
      await handleDragEnd(fakeEvent as any);
      return;
    }

    const backup = planos;
    setPlanos((prev) => prev.map((p) => p.id_pedido === idPedido
      ? { ...p, status_producao: novoStatus, progresso: novoStatus === "finalizado" ? 100 : p.progresso }
      : p
    ));
    const res = await fetch("/api/plano-producao", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...planoAtual, status_producao: novoStatus }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) { setPlanos(backup); setErro(apiError(result)); }
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

    const ids3mfFalha = nomes.pedido3mfs.get(Number(idPedido)) || (planoAtual.id_3mf?[Number(planoAtual.id_3mf)]:[]);
    if (destino==="falha" && ids3mfFalha.length > 0 && options) {
      const linhas3mf=(options.arquivos3mf||[]).filter((a)=>ids3mfFalha.includes(Number(a.id_3mf)));
      const slots:SlotFilamento[]=[];
      for (const linha of linhas3mf) {
        const comp=(options.componentes||[]).find((c)=>Number(c.id_componente_stl)===Number(linha.id_componente_stl));
        if (!comp) continue;
        const nomeStl=String(comp.nome_componente??`STL ${linha.id_componente_stl}`);
        for (let i=1;i<=8;i++) {
          const idFil=Number((comp as Record<string,unknown>)[`id_filamento${i}`]||0);
          const gramas=Number((comp as Record<string,unknown>)[`gramas_filamento_${i}`]||0);
          if (!idFil||gramas<=0) continue;
          const fil=(options.filamentos||[]).find((f)=>Number(f.id_filamento)===idFil);
          const nomeFil=String(fil?.nome_filamento??`Filamento ${idFil}`);
          const cor=fil?.cor_filamento?` ${fil.cor_filamento}`:"";
          slots.push({idFilamento:idFil,nomeFilamento:`${nomeFil}${cor}`,nomeStl,gramas:gramas*Number(linha.qtd_componente||1),gramasPerdido:"",idEstoqueEscolhido:""});
        }
      }
      setPlanos((prev)=>prev.map((p)=>p.id_pedido===idPedido?{...p,status_producao:"falha"}:p));
      setFalhaCarretelEmAndamento({idPedido,statusAnterior:planoAtual.status_producao||"pedidos",slots,tempoPerdido:"",salvando:false});
      return;
    }
    if (destino==="falha") {
      setPlanos((prev)=>prev.map((p)=>p.id_pedido===idPedido?{...p,status_producao:"falha"}:p));
      setFalhaEmAndamento({idPedido,statusAnterior:planoAtual.status_producao||"pedidos",gramasPerdido:"",tempoPerdido:"",salvando:false});
      return;
    }

    // Ao mover para finalizado → auto-seleciona melhor carretel e debita direto, sem modal
    const ids3mfFin = nomes.pedido3mfs.get(Number(idPedido)) || (planoAtual.id_3mf?[Number(planoAtual.id_3mf)]:[]);
    if (destino === "finalizado" && ids3mfFin.length > 0 && options) {
      const linhas3mf = (options.arquivos3mf || []).filter((a) => ids3mfFin.includes(Number(a.id_3mf)));
      const slots: SlotFilamento[] = [];
      for (const linha of linhas3mf) {
        const comp = (options.componentes || []).find((c) => Number(c.id_componente_stl) === Number(linha.id_componente_stl));
        if (!comp) continue;
        const nomeStl = String(comp.nome_componente ?? `STL ${linha.id_componente_stl}`);
        for (let i = 1; i <= 8; i++) {
          const idFil  = Number((comp as Record<string,unknown>)[`id_filamento${i}`] || 0);
          const gramas = Number((comp as Record<string,unknown>)[`gramas_filamento_${i}`] || 0);
          if (!idFil || gramas <= 0) continue;
          const fil = (options.filamentos || []).find((f) => Number(f.id_filamento) === idFil);
          const nomeFil = String(fil?.nome_filamento ?? `Filamento ${idFil}`);
          const cor = fil?.cor_filamento ? ` ${fil.cor_filamento}` : "";
          const necessario = gramas * Number(linha.qtd_componente || 1);
          // Auto-seleciona: menor carretel suficiente; se nenhum for suficiente, o maior disponível
          const estoqueDisp = (options.estoque || [])
            .filter((e) => Number(e.id_filamento) === idFil)
            .sort((a, b) => Number(a.qtd_estoque_gramas || 0) - Number(b.qtd_estoque_gramas || 0));
          const suficientes = estoqueDisp.filter((e) => Number(e.qtd_estoque_gramas || 0) >= necessario);
          const escolhido = suficientes.length > 0
            ? suficientes[0]
            : estoqueDisp.length > 0 ? estoqueDisp[estoqueDisp.length - 1] : null;
          if (!escolhido) continue;
          const j = estoqueDisp.indexOf(escolhido);
          const estKey = `${idFil}_${escolhido.localizacao ?? ""}_${j}`;
          slots.push({
            idFilamento: idFil,
            nomeFilamento: `${nomeFil}${cor}`,
            nomeStl,
            gramas: necessario,
            gramasPerdido: "",
            idEstoqueEscolhido: estKey,
          });
        }
      }
      if (!slots.length) {
        // Sem filamentos cadastrados — finaliza direto sem debitar
        setPlanos((prev) => prev.map((p) => p.id_pedido === idPedido ? { ...p, status_producao: "finalizado", progresso: 100 } : p));
        await fetch("/api/plano-producao", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...planoAtual, status_producao: "finalizado", progresso: 100 }) });
        setMensagem("Pedido finalizado.");
        return;
      }
      // Debita direto, sem abrir modal
      setPlanos((prev) => prev.map((p) => p.id_pedido === idPedido ? { ...p, status_producao: "finalizado", progresso: 100 } : p));
      setFinalizacaoEmAndamento({ idPedido, statusAnterior: planoAtual.status_producao || "pedidos", slots, salvando: true });
      try {
        const r1 = await fetch("/api/plano-producao", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...planoAtual, status_producao: "finalizado", progresso: 100 }) });
        const d1 = await r1.json();
        if (!r1.ok || !d1.ok) throw new Error(d1.error || "Erro ao finalizar.");
        for (const slot of slots) {
          if (!slot.idEstoqueEscolhido) continue;
          const parts = slot.idEstoqueEscolhido.split("_");
          const idFilStr = parts[0];
          const localizacao = parts.slice(1, -1).join("_");
          const idx = Number(parts[parts.length - 1]);
          await fetch("/api/estoque-debito", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_filamento: Number(idFilStr), localizacao: localizacao || undefined, idx: Number.isNaN(idx) ? 0 : idx, gramas: slot.gramas }),
          });
        }
        setMensagem("Pedido finalizado e estoque debitado automaticamente.");
        setFinalizacaoEmAndamento(null);
        await carregarDados();
      } catch (err) {
        setPlanos((prev) => prev.map((p) => p.id_pedido === idPedido ? { ...p, status_producao: planoAtual.status_producao || "pedidos" } : p));
        setErro(err instanceof Error ? err.message : "Erro ao finalizar.");
        setFinalizacaoEmAndamento(null);
      }
      return;
    }

    const backup=planos;
    setPlanos((prev)=>prev.map((p)=>p.id_pedido===idPedido?{...p,status_producao:destino,progresso:destino==="finalizado"?100:destino==="producao"?p.progresso||1:p.progresso||0}:p));
    const res=await fetch("/api/plano-producao",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...planoAtual,status_producao:destino,progresso:destino==="finalizado"?100:planoAtual.progresso||0})});
    const result=await res.json();
    if (!res.ok||!result.ok) { setPlanos(backup); setErro(apiError(result)); return; }
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

  async function confirmarFalhaCarretel() {
    if (!falhaCarretelEmAndamento) return;
    const snap = { ...falhaCarretelEmAndamento, slots: falhaCarretelEmAndamento.slots.map(s=>({...s})) };
    setFalhaCarretelEmAndamento((prev)=>prev?{...prev,salvando:true}:null);
    const planoAtual = planos.find((p)=>p.id_pedido===snap.idPedido);
    try {
      // 1. Persiste status falha
      const r1=await fetch("/api/plano-producao",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...planoAtual,status_producao:"falha"})});
      const d1=await r1.json();
      if (!r1.ok||!d1.ok) throw new Error(d1.error||"Erro ao salvar.");
      // 2. Grava em falhas_producao (soma total das gramas perdidas)
      const totalGramas=snap.slots.reduce((acc,s)=>acc+(Number(s.gramasPerdido)||0),0);
      await fetch("/api/falhas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        id_3mf:planoAtual?.id_3mf??null,
        tempo_impressao_min_perdido:snap.tempoPerdido?Number(snap.tempoPerdido):null,
        quant_mat_perdido:totalGramas||null,
      })});
      // 3. Debita de cada carretel o que foi efetivamente perdido (gramasPerdido por slot)
      for (const slot of snap.slots) {
        if (!slot.idEstoqueEscolhido||!slot.gramasPerdido) continue;
        const parts=slot.idEstoqueEscolhido.split("_");
        const idFilStr=parts[0];
        const localizacao=parts.slice(1,-1).join("_");
        const idx=Number(parts[parts.length-1]);
        await fetch("/api/estoque-debito",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
          id_filamento:Number(idFilStr),
          localizacao:localizacao||undefined,
          idx:Number.isNaN(idx)?0:idx,
          gramas:Number(slot.gramasPerdido), // usa o valor digitado pelo usuário
        })});
      }
      setMensagem("Falha registrada e estoque debitado.");
      setFalhaCarretelEmAndamento(null);
      await carregarDados();
    } catch(err) {
      setPlanos((prev)=>prev.map((p)=>p.id_pedido===snap.idPedido?{...p,status_producao:snap.statusAnterior}:p));
      setErro(err instanceof Error?err.message:"Erro ao registrar falha.");
      setFalhaCarretelEmAndamento(null);
    }
  }

  function cancelarFalhaCarretel() {
    if (!falhaCarretelEmAndamento) return;
    setPlanos((prev)=>prev.map((p)=>p.id_pedido===falhaCarretelEmAndamento.idPedido?{...p,status_producao:falhaCarretelEmAndamento.statusAnterior}:p));
    setFalhaCarretelEmAndamento(null);
  }

  async function confirmarFinalizacao() {
    if (!finalizacaoEmAndamento) return;
    const snap = { ...finalizacaoEmAndamento, slots: finalizacaoEmAndamento.slots.map(s => ({...s})) };
    setFinalizacaoEmAndamento((prev) => prev ? { ...prev, salvando: true } : null);
    const planoAtual = planos.find((p) => p.id_pedido === snap.idPedido);
    try {
      // 1. Salva status finalizado no banco
      const r1 = await fetch("/api/plano-producao", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...planoAtual, status_producao: "finalizado", progresso: 100 }),
      });
      const d1 = await r1.json();
      if (!r1.ok || !d1.ok) throw new Error(d1.error || "Erro ao finalizar.");

      // 2. Debita cada filamento no carretel/registro escolhido
      for (const slot of snap.slots) {
        if (!slot.idEstoqueEscolhido) continue;
        // idEstoqueEscolhido = "id_filamento_localizacao" — usamos id_filamento + localizacao para identificar a linha
        // key format: "idFilamento_localizacao_index"
        const parts = slot.idEstoqueEscolhido.split("_");
        const idFilStr = parts[0];
        const localizacao = parts.slice(1, -1).join("_"); // remove first and last
        // Extrai o índice j do final da key para identificar o carretel exato
        const idx = Number(parts[parts.length - 1]);
        await fetch("/api/estoque-debito", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_filamento: Number(idFilStr),
            localizacao:  localizacao || undefined,
            idx:          Number.isNaN(idx) ? 0 : idx,
            gramas:       slot.gramas,
          }),
        });
      }

      setMensagem("Pedido finalizado e estoque debitado.");
      setFinalizacaoEmAndamento(null);
      await carregarDados(); // Refresh completo após finalizar
    } catch (err) {
      setPlanos((prev) => prev.map((p) => p.id_pedido === snap.idPedido ? { ...p, status_producao: snap.statusAnterior } : p));
      setErro(err instanceof Error ? err.message : "Erro ao finalizar.");
      setFinalizacaoEmAndamento(null);
    }
  }

  function cancelarFinalizacao() {
    if (!finalizacaoEmAndamento) return;
    setPlanos((prev) => prev.map((p) => p.id_pedido === finalizacaoEmAndamento.idPedido ? { ...p, status_producao: finalizacaoEmAndamento.statusAnterior } : p));
    setFinalizacaoEmAndamento(null);
  }

  // Atualiza progresso baseado nos STLs concluídos
  async function atualizarProgresso(idPedido: number, novoProgresso: number) {
    const planoAtual = planos.find((p) => p.id_pedido === idPedido);
    if (!planoAtual) return;
    setPlanos((prev) => prev.map((p) => p.id_pedido === idPedido ? { ...p, progresso: novoProgresso } : p));
    await fetch("/api/plano-producao", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...planoAtual, progresso: novoProgresso }),
    });
  }

  // Clona o card para a coluna Falha com apenas os STLs marcados
  async function registrarFalhaStls(idPedido: number, stlsComFalha: number[], gramasPerdido: string, tempoPerdido: string) {
    const planoAtual = planos.find((p) => p.id_pedido === idPedido);
    if (!planoAtual) return;
    try {
      setErro(""); setMensagem("");
      // 1. Atualiza status do plano original para 'falha'
      const r1 = await fetch("/api/plano-producao", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...planoAtual, status_producao: "falha" }),
      });
      const d1 = await r1.json();
      if (!r1.ok || !d1.ok) throw new Error(d1.error || "Erro ao atualizar plano.");
      // 2. Grava em falhas_producao para cada STL com falha
      for (const id3mfLinha of stlsComFalha) {
        await fetch("/api/falhas", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_3mf: id3mfLinha,
            tempo_impressao_min_perdido: tempoPerdido ? Number(tempoPerdido) : null,
            quant_mat_perdido: gramasPerdido ? Number(gramasPerdido) : null,
          }),
        });
      }
      setPlanos((prev) => prev.map((p) => p.id_pedido === idPedido ? { ...p, status_producao: "falha" } : p));
      setMensagem("Falha registrada com sucesso.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar falha.");
    }
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
                  const idPed=e.target.value;
                  const peso=calcPesoPedido(options,idPed);
                  setForm((f)=>({...f,id_pedido:idPed,peso_estimado_g:peso,id_impressora:"",tempo_impressao_min:""}));
                  avaliarEstoque(idPed);
                  // Verifica impressora sugerida pelos componentes do pedido
                  const ids3mfSug=nomes.pedido3mfs.get(Number(idPed))||[];
                  const linhasSug=(options?.arquivos3mf||[]).filter((a)=>ids3mfSug.includes(Number(a.id_3mf)));
                  const ciData=options?.compImpressoras||[];
                  // Pega a primeira impressora encontrada nos componentes
                  for (const linha of linhasSug) {
                    const ci=ciData.find((c)=>Number(c.id_componente_stl)===Number(linha.id_componente_stl));
                    if (ci) {
                      const imp=(options?.impressoras||[]).find((i)=>Number(i.id_impressora)===Number(ci.id_impressora));
                      if (imp) {
                        setSugestaoImp({
                          idImpressora:Number(ci.id_impressora),
                          nomeImpressora:String(imp.nome_impressora??imp.nome??ci.id_impressora),
                          tempoMin:Number(ci.tempo_impressao_min)||0,
                        });
                        return;
                      }
                    }
                  }
                  setSugestaoImp(null);
                }}>
                <option value="">Selecione</option>
                {(options?.pedidos||[]).map((p)=>(<option key={String(p.id_pedido)} value={String(p.id_pedido)}>{labelFrom(p,["label_pedido","nome_pedido","numero_pedido"],"Pedido cadastrado")}</option>))}
              </select>
            </Field>

            {/* Banner de sugestão de impressora */}
            {sugestaoImp && form.id_pedido && !form.id_impressora && (
              <div className="md:col-span-2 xl:col-span-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-400/30 bg-violet-400/10 px-4 py-3">
                  <div className="text-sm">
                    <span className="font-bold text-violet-300">Impressora sugerida: </span>
                    <span className="text-white">{sugestaoImp.nomeImpressora}</span>
                    {sugestaoImp.tempoMin > 0 && (
                      <span className="ml-2 text-slate-400">— {sugestaoImp.tempoMin} min</span>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          id_impressora: String(sugestaoImp.idImpressora),
                          tempo_impressao_min: sugestaoImp.tempoMin > 0 ? String(sugestaoImp.tempoMin) : f.tempo_impressao_min,
                        }));
                        setSugestaoImp(null);
                      }}
                      className="rounded-xl bg-violet-500 px-3 py-1.5 text-xs font-black text-white hover:bg-violet-400">
                      Sim, usar
                    </button>
                    <button type="button"
                      onClick={() => setSugestaoImp(null)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10">
                      Não, escolher
                    </button>
                  </div>
                </div>
              </div>
            )}

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
              {(()=>{
                // Mostra tempo de referência da impressora selecionada
                const ids3mfRef=nomes.pedido3mfs.get(Number(form.id_pedido))||[];
                const linhasRef=(options?.arquivos3mf||[]).filter((a)=>ids3mfRef.includes(Number(a.id_3mf)));
                let tempoRef=0;
                for (const l of linhasRef) {
                  const ci=(options?.compImpressoras||[]).find((c)=>Number(c.id_componente_stl)===Number(l.id_componente_stl)&&Number(c.id_impressora)===Number(form.id_impressora));
                  const comp=(options?.componentes||[]).find((c)=>Number(c.id_componente_stl)===Number(l.id_componente_stl));
                  const t=ci?Number(ci.tempo_impressao_min):Number((comp as Record<string,unknown>|undefined)?.tempo_impressao_min||0);
                  tempoRef+=t*Number(l.qtd_componente||1);
                }
                return (
                  <>
                    <input value={form.tempo_impressao_min}
                      onChange={(e)=>setForm((f)=>({...f,tempo_impressao_min:e.target.value}))}
                      type="number" min="0" className="field"
                      placeholder={tempoRef>0?`Referência: ${tempoRef} min`:"Calculado automaticamente"} />
                    {tempoRef>0&&!form.tempo_impressao_min&&(
                      <p className="mt-1 text-xs text-violet-400">⏱ Referência cadastrada: {tempoRef} min — deixe em branco para usar automaticamente</p>
                    )}
                  </>
                );
              })()}
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

            {alertaEstoque&&alertaEstoque.itens&&(
              <div className="xl:col-span-4 space-y-3">
                {/* Bloco insuficientes */}
                {alertaEstoque.itens.filter(it=>!it.ok).length>0&&(
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-bold text-red-300 text-sm">🚫 Estoque insuficiente</span>
                      <button type="button"
                        onClick={()=>{
                          const linhas=alertaEstoque.itens!.filter(it=>!it.ok)
                            .map(it=>`${it.label}: ${it.necessario}g necessário (disponível: ${it.disponivel}g)`);
                          navigator.clipboard.writeText(linhas.join("\n"));
                        }}
                        className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-400/20">
                        📋 Copiar lista de compras
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-4">
                      {alertaEstoque.itens.filter(it=>!it.ok).map((it,i)=>(
                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-red-500/15 px-2 py-1.5 text-xs text-red-300">
                          <span className="truncate font-bold">{it.label}</span>
                          <span className="shrink-0 font-mono whitespace-nowrap">✗ {it.necessario}g / {it.disponivel}g{it.localizacao?` (${it.localizacao})`:""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Bloco suficientes */}
                {alertaEstoque.itens.filter(it=>it.ok).length>0&&(
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                    <div className="mb-2 font-bold text-emerald-300 text-sm">✅ Estoque suficiente</div>
                    <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-4">
                      {alertaEstoque.itens.filter(it=>it.ok).map((it,i)=>(
                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-300">
                          <span className="truncate font-bold">{it.label}</span>
                          <span className="shrink-0 font-mono whitespace-nowrap">✓ {it.necessario}g / {it.disponivel}g{it.localizacao?` (${it.localizacao})`:""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  options={options}
                  falhaEmAndamento={falhaEmAndamento}
                  onFalhaChange={(field,value)=>setFalhaEmAndamento((prev)=>prev?{...prev,[field]:value}:null)}
                  onFalhaConfirm={confirmarFalha} onFalhaCancel={cancelarFalha}
                  onRegistrarFalhaStls={registrarFalhaStls}
                  onAtualizarProgresso={atualizarProgresso}
                  finalizacaoEmAndamento={finalizacaoEmAndamento}
                  onFinSlotChange={(idx,val)=>setFinalizacaoEmAndamento((prev)=>prev?{...prev,slots:prev.slots.map((s,j)=>j===idx?{...s,idEstoqueEscolhido:val}:s)}:null)}
                  onFinConfirm={confirmarFinalizacao} onFinCancel={cancelarFinalizacao}
                  falhaCarretelEmAndamento={falhaCarretelEmAndamento}
                  onFalhaCarretelSlotChange={(idx,val)=>setFalhaCarretelEmAndamento((prev)=>prev?{...prev,slots:prev.slots.map((s,j)=>j===idx?{...s,idEstoqueEscolhido:val}:s)}:null)}
                  onFalhaCarretelSlotGramas={(idx,v)=>setFalhaCarretelEmAndamento((prev)=>prev?{...prev,slots:prev.slots.map((s,j)=>j===idx?{...s,gramasPerdido:v}:s)}:null)}
                  onFalhaCarretelTempo={(v)=>setFalhaCarretelEmAndamento((prev)=>prev?{...prev,tempoPerdido:v}:null)}
                  onFalhaCarretelConfirm={confirmarFalhaCarretel} onFalhaCarretelCancel={cancelarFalhaCarretel}
                  onMover={moverPlano} onEdit={editarPlano} onDelete={excluirPlano} />
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

function ColunaProducao({coluna,planos,nomes,options,falhaEmAndamento,onFalhaChange,onFalhaConfirm,onFalhaCancel,onRegistrarFalhaStls,onAtualizarProgresso,finalizacaoEmAndamento,onFinSlotChange,onFinConfirm,onFinCancel,falhaCarretelEmAndamento,onFalhaCarretelSlotChange,onFalhaCarretelSlotGramas,onFalhaCarretelTempo,onFalhaCarretelConfirm,onFalhaCarretelCancel,onMover,onEdit,onDelete}:{
  coluna:{id:StatusProducao;titulo:string;subtitulo:string;bordaTopo:string};
  planos:PlanoProducao[]; nomes:Nomes; options:OptionsPayload|null; falhaEmAndamento:FalhaEmAndamento|null;
  onFalhaChange:(field:"gramasPerdido"|"tempoPerdido",value:string)=>void;
  onFalhaConfirm:()=>void; onFalhaCancel:()=>void;
  onRegistrarFalhaStls:(idPedido:number,stls:number[],gramas:string,tempo:string)=>void;
  onAtualizarProgresso:(idPedido:number,progresso:number)=>void;
  finalizacaoEmAndamento:FinalizacaoEmAndamento|null;
  onFinSlotChange:(idx:number,val:string)=>void;
  onFinConfirm:()=>void; onFinCancel:()=>void;
  falhaCarretelEmAndamento:FalhaCarretelEmAndamento|null;
  onFalhaCarretelSlotChange:(idx:number,val:string)=>void;
  onFalhaCarretelSlotGramas:(idx:number,v:string)=>void;
  onFalhaCarretelTempo:(v:string)=>void;
  onFalhaCarretelConfirm:()=>void; onFalhaCarretelCancel:()=>void;
  onMover:(idPedido:number,direcao:"avancar"|"recuar")=>void;
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
            <CardPlano key={plano.id_pedido} plano={plano} nomes={nomes} options={options}
              falhaEmAndamento={falhaEmAndamento?.idPedido===plano.id_pedido?falhaEmAndamento:null}
              onFalhaChange={onFalhaChange} onFalhaConfirm={onFalhaConfirm} onFalhaCancel={onFalhaCancel}
              onRegistrarFalhaStls={onRegistrarFalhaStls} onAtualizarProgresso={onAtualizarProgresso}
              finalizacaoEmAndamento={finalizacaoEmAndamento?.idPedido===plano.id_pedido?finalizacaoEmAndamento:null}
              onFinSlotChange={onFinSlotChange} onFinConfirm={onFinConfirm} onFinCancel={onFinCancel}
              falhaCarretelEmAndamento={falhaCarretelEmAndamento?.idPedido===plano.id_pedido?falhaCarretelEmAndamento:null}
              onFalhaCarretelSlotChange={onFalhaCarretelSlotChange} onFalhaCarretelSlotGramas={onFalhaCarretelSlotGramas}
              onFalhaCarretelTempo={onFalhaCarretelTempo} onFalhaCarretelConfirm={onFalhaCarretelConfirm}
              onFalhaCarretelCancel={onFalhaCarretelCancel}
              onMover={onMover} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function CardPlano({plano,nomes,options,flutuando=false,falhaEmAndamento,onFalhaChange,onFalhaConfirm,onFalhaCancel,onRegistrarFalhaStls,onAtualizarProgresso,finalizacaoEmAndamento,onFinSlotChange,onFinConfirm,onFinCancel,falhaCarretelEmAndamento,onFalhaCarretelSlotChange,onFalhaCarretelSlotGramas,onFalhaCarretelTempo,onFalhaCarretelConfirm,onFalhaCarretelCancel,onMover,onEdit,onDelete}:{
  plano:PlanoProducao; nomes:Nomes; options?:OptionsPayload|null; flutuando?:boolean; falhaEmAndamento?:FalhaEmAndamento|null;
  onFalhaChange?:(field:"gramasPerdido"|"tempoPerdido",value:string)=>void;
  onFalhaConfirm?:()=>void; onFalhaCancel?:()=>void;
  onRegistrarFalhaStls?:(idPedido:number,stls:number[],gramas:string,tempo:string)=>void;
  onAtualizarProgresso?:(idPedido:number,progresso:number)=>void;
  finalizacaoEmAndamento?:FinalizacaoEmAndamento|null;
  onFinSlotChange?:(idx:number,val:string)=>void;
  onFinConfirm?:()=>void; onFinCancel?:()=>void;
  falhaCarretelEmAndamento?:FalhaCarretelEmAndamento|null;
  onFalhaCarretelSlotChange?:(idx:number,val:string)=>void;
  onFalhaCarretelSlotGramas?:(idx:number,v:string)=>void;
  onFalhaCarretelTempo?:(v:string)=>void;
  onFalhaCarretelConfirm?:()=>void; onFalhaCarretelCancel?:()=>void;
  onMover?:(idPedido:number,direcao:"avancar"|"recuar")=>void;
  onEdit?:(plano:PlanoProducao)=>void; onDelete?:(idPedido:number)=>void;
}) {
  const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({
    id:String(plano.id_pedido),
    disabled: !!finalizacaoEmAndamento || !!falhaEmAndamento,
  });
  const style={transform:CSS.Transform.toString(transform),transition};
  const prioridade=plano.prioridade||"Média";
  const progresso=plano.progresso??0;
  const isFalha=plano.status_producao==="falha";
  const aguardaForm=!!falhaEmAndamento;
  const aguardaFin=!!finalizacaoEmAndamento;
  const aguardaFalhaCarretel=!!falhaCarretelEmAndamento;

  // Card começa colapsado; expande ao clicar no chevron
  const [expandido,setExpandido]=useState(false);
  // Checkboxes de STL — inicializa do banco (plano.stls_concluidos)
  const [stlsConcluidos,   setStlsConcluidos]   = useState<number[]>(
    () => Array.isArray((plano as Record<string,unknown>).stls_concluidos)
      ? ((plano as Record<string,unknown>).stls_concluidos as number[])
      : []
  );
  const [stlsComFalha,     setStlsComFalha]     = useState<number[]>([]);
  const [stlsExpandidos,   setStlsExpandidos]   = useState<Set<number>>(new Set());
  const [mostrarFormFalhaStl, setMostrarFormFalhaStl] = useState(false);
  const [gramasFalhaStl,   setGramasFalhaStl]   = useState("");
  const [tempoFalhaStl,    setTempoFalhaStl]    = useState("");

  const corPrioridade:Record<string,string>={
    Baixa:"border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    Media:"border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
    Média:"border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
    Alta:"border-orange-500/30 bg-orange-500/15 text-orange-300",
    Urgente:"border-red-500/30 bg-red-500/15 text-red-300",
  };

  // Quando o modal de falha abre, força expansão para mostrar os campos
  const deveExpandir = expandido || aguardaForm || aguardaFin || aguardaFalhaCarretel || flutuando;

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
              {/* Lista todos os 3MFs do pedido */}
              {(()=>{
                const ids3mfDoPedido=nomes.pedido3mfs.get(Number(plano.id_pedido))||[];
                if(!ids3mfDoPedido.length) return (
                  <div className="flex items-center gap-2">
                    <Factory className="h-3.5 w-3.5 shrink-0 text-violet-300"/>
                    <span className="text-slate-500">Arquivo 3MF nao definido</span>
                  </div>
                );
                return (
                  <div className="space-y-0.5">
                    {ids3mfDoPedido.map((id3mf)=>(
                      <div key={id3mf} className="flex items-center gap-2">
                        <Factory className="h-3.5 w-3.5 shrink-0 text-violet-300"/>
                        <span className="truncate">{nomes.arquivos3mf.get(id3mf)||`3MF ${id3mf}`}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-cyan-300"/>
                <span>{formatTempo(plano.tempo_impressao_min)}</span>
              </div>
              {/* STLs com checkboxes de concluido e falha — todos os 3MFs do pedido */}
              {options&&(()=>{
                const ids3mfDoPedido=nomes.pedido3mfs.get(Number(plano.id_pedido))||[];
                const linhas=(options.arquivos3mf||[]).filter((a)=>ids3mfDoPedido.includes(Number(a.id_3mf)));
                if(!linhas.length) return null;
                return (
                  <div className="mt-1.5 border-t border-white/10 pt-1.5 space-y-1.5">
                    {linhas.map((a,i)=>{
                      const comp=(options.componentes||[]).find((c)=>Number(c.id_componente_stl)===Number(a.id_componente_stl));
                      const nome=comp?String(comp.nome_componente??comp.nome??a.id_componente_stl):String(a.id_componente_stl??"?");
                      const lineId=Number(a.id_linha??i);
                      const isConcluido=stlsConcluidos.includes(lineId);
                      const isFalhaStl=stlsComFalha.includes(lineId);
                      const isStlExpandido=stlsExpandidos.has(lineId);

                      // Monta itens de filamento no mesmo formato do alertaEstoque
                      type ItemFilamento={label:string;necessario:number;disponivel:number;localizacao:string;ok:boolean};
                      const itensFilamento:ItemFilamento[]=[];
                      if (comp) {
                        const carreteisPorFil=new Map<number,{qtd:number;localizacao:string}[]>();
                        for (const e of options.estoque||[]) {
                          const idF=Number(e.id_filamento);
                          const qtd=Number(e.qtd_estoque_gramas||e.quantidade||e.qtd||0);
                          const loc=String(e.localizacao??"");
                          if (idF&&qtd>=0) {
                            if (!carreteisPorFil.has(idF)) carreteisPorFil.set(idF,[]);
                            carreteisPorFil.get(idF)!.push({qtd,localizacao:loc});
                          }
                        }
                        for (let n=1;n<=8;n++) {
                          const idFil=Number((comp as Record<string,unknown>)[`id_filamento${n}`]||0);
                          const gramas=Number((comp as Record<string,unknown>)[`gramas_filamento_${n}`]||0);
                          if (!idFil||gramas<=0) continue;
                          const fil=(options.filamentos||[]).find((f)=>Number(f.id_filamento)===idFil);
                          const nomeFil=fil?String(fil.nome_filamento??`Filamento ${idFil}`):`Filamento ${idFil}`;
                          const cor=fil?.cor_filamento?` · ${String(fil.cor_filamento)}`:"";
                          const idFab=fil?.id_fabricante_filamento;
                          const fabRow=idFab?(options.fabricantesFilamentos||[]).find((x)=>Number(x.id_fabricante_filamento)===Number(idFab)):null;
                          const fab=fabRow?` · ${String(fabRow.nome_fabricante??"")}`:""
                          const label=`${nomeFil}${cor}${fab}`;
                          const qtdComp=Number(a.qtd_componente||1);
                          const necessario=Number((gramas*qtdComp).toFixed(3));
                          const carreteis=(carreteisPorFil.get(idFil)||[]).sort((x,y)=>x.qtd-y.qtd);
                          const suficientes=carreteis.filter(c=>c.qtd>=necessario);
                          const escolhido=suficientes.length>0?suficientes[0]:carreteis.length>0?carreteis[carreteis.length-1]:{qtd:0,localizacao:""};
                          itensFilamento.push({label,necessario,disponivel:Number(escolhido.qtd.toFixed(3)),localizacao:escolhido.localizacao,ok:escolhido.qtd>=necessario});
                        }
                      }
                      const temFilamentos=itensFilamento.length>0;
                      const tudoOk=itensFilamento.every(it=>it.ok);

                      return (
                        <div key={i} className={`rounded-lg transition-colors ${isConcluido?"bg-emerald-500/10":isFalhaStl?"bg-red-500/10":""}`}>
                          <div className="flex items-center gap-1.5 px-1.5 py-1">
                            <input type="checkbox" checked={isConcluido}
                              onChange={async ()=>{
                                const novo=isConcluido?stlsConcluidos.filter(x=>x!==lineId):[...stlsConcluidos,lineId];
                                setStlsConcluidos(novo);
                                const pct=Math.round((novo.length/linhas.length)*100);
                                onAtualizarProgresso?.(plano.id_pedido,Math.min(pct,100));
                                await fetch("/api/plano-producao",{
                                  method:"PUT",headers:{"Content-Type":"application/json"},
                                  body:JSON.stringify({...plano,stls_concluidos:novo,progresso:Math.min(pct,100)}),
                                });
                              }}
                              className="h-3 w-3 accent-emerald-400 shrink-0 cursor-pointer" title="Concluido"/>
                            <span className={`flex-1 truncate text-xs ${isConcluido?"line-through text-slate-600":isFalhaStl?"text-red-400":"text-slate-400"}`}>{nome}</span>
                            <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-500">x{String(a.qtd_componente??1)}</span>
                            <input type="checkbox" checked={isFalhaStl}
                              onChange={()=>setStlsComFalha(isFalhaStl?stlsComFalha.filter(x=>x!==lineId):[...stlsComFalha,lineId])}
                              className="h-3 w-3 accent-red-400 shrink-0 cursor-pointer" title="Com falha"/>
                            <AlertTriangle className={`h-3 w-3 shrink-0 ${isFalhaStl?"text-red-400":"text-slate-700"}`}/>
                            {temFilamentos&&(
                              <button
                                type="button"
                                onPointerDown={(e)=>e.stopPropagation()}
                                onClick={(e)=>{
                                  e.stopPropagation();
                                  setStlsExpandidos((prev)=>{
                                    const next=new Set(prev);
                                    if (next.has(lineId)) next.delete(lineId); else next.add(lineId);
                                    return next;
                                  });
                                }}
                                className={`shrink-0 rounded-md p-0.5 transition-colors ${tudoOk?"bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40":"bg-red-500/20 text-red-400 hover:bg-red-500/40"}`}
                                title={isStlExpandido?"Ocultar filamentos":"Ver filamentos necessários"}
                              >
                                {isStlExpandido?<ChevronUp className="h-3 w-3"/>:<ChevronDown className="h-3 w-3"/>}
                              </button>
                            )}
                          </div>
                          {temFilamentos&&isStlExpandido&&(
                            <div className="mx-1.5 mb-1.5 space-y-1">
                              {itensFilamento.filter(it=>!it.ok).length>0&&(
                                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5">
                                  <p className="mb-1 text-[10px] font-black text-red-300">🚫 Estoque insuficiente</p>
                                  <div className="space-y-0.5">
                                    {itensFilamento.filter(it=>!it.ok).map((it,j)=>(
                                      <div key={j} className="flex items-center justify-between gap-2 rounded bg-red-500/15 px-1.5 py-1 text-[11px] text-red-300">
                                        <span className="truncate font-bold">{it.label}</span>
                                        <span className="shrink-0 font-mono whitespace-nowrap">✗ {it.necessario}g / {it.disponivel}g{it.localizacao?` (${it.localizacao})`:""}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {itensFilamento.filter(it=>it.ok).length>0&&(
                                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5">
                                  <p className="mb-1 text-[10px] font-black text-emerald-300">✅ Estoque suficiente</p>
                                  <div className="space-y-0.5">
                                    {itensFilamento.filter(it=>it.ok).map((it,j)=>(
                                      <div key={j} className="flex items-center justify-between gap-2 rounded bg-emerald-500/10 px-1.5 py-1 text-[11px] text-emerald-300">
                                        <span className="truncate font-bold">{it.label}</span>
                                        <span className="shrink-0 font-mono whitespace-nowrap">✓ {it.necessario}g / {it.disponivel}g{it.localizacao?` (${it.localizacao})`:""}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex gap-3 pt-0.5 text-[10px] text-slate-600">
                      <span className="flex items-center gap-1"><span className="text-emerald-400">checkmark</span> Concluido</span>
                      <span className="flex items-center gap-1 text-red-500">triangle Falha</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Barra de progresso baseada nos STLs concluidos */}
            {!isFalha&&(()=>{
              const ids3mfDoPedido=nomes.pedido3mfs.get(Number(plano.id_pedido))||[];
              const linhas=options?(options.arquivos3mf||[]).filter((a)=>ids3mfDoPedido.includes(Number(a.id_3mf))):[];
              const total=linhas.length;
              const pct=total>0?Math.round((stlsConcluidos.length/total)*100):progresso;
              return (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>Progresso</span>
                    <span>{total>0?`${Math.min(stlsConcluidos.length,total)}/${total} STLs`:`${progresso}%`}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-400 transition-all" style={{width:`${Math.min(Math.max(total>0?pct:progresso,0),100)}%`}}/>
                  </div>
                </div>
              );
            })()}

            {/* Botao registrar falha nos STLs marcados */}
            {!isFalha&&stlsComFalha.length>0&&!mostrarFormFalhaStl&&(
              <button type="button"
                onClick={()=>setMostrarFormFalhaStl(true)}
                className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20 flex items-center justify-center gap-1.5">
                <AlertTriangle className="h-3 w-3"/>
                Registrar falha em {stlsComFalha.length} STL{stlsComFalha.length>1?"s":""}
              </button>
            )}

            {/* Form de falha por STL */}
            {mostrarFormFalhaStl&&(
              <div className="rounded-xl border border-red-500/40 bg-black/40 p-3 space-y-2">
                <p className="text-xs font-black text-red-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5"/> Registrar falha nos STLs marcados
                </p>
                <div>
                  <label className="mb-1 block text-xs font-bold text-red-300/80">Material perdido (g) *</label>
                  <input type="number" min="0" step="0.1" value={gramasFalhaStl}
                    onChange={(e)=>setGramasFalhaStl(e.target.value)} placeholder="Ex.: 45.5"
                    className="w-full rounded-lg border border-red-500/30 bg-slate-950/80 px-3 py-1.5 text-xs text-white outline-none focus:border-red-400 placeholder:text-slate-600"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-red-300/80">Tempo perdido (min) *</label>
                  <input type="number" min="0" value={tempoFalhaStl}
                    onChange={(e)=>setTempoFalhaStl(e.target.value)} placeholder="Ex.: 120"
                    className="w-full rounded-lg border border-red-500/30 bg-slate-950/80 px-3 py-1.5 text-xs text-white outline-none focus:border-red-400 placeholder:text-slate-600"/>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button"
                    disabled={!gramasFalhaStl||!tempoFalhaStl}
                    onClick={()=>{
                      // Abre modal de seleção de carretel para debitar material perdido
      if (options && plano.id_3mf) {
        const linhas3mf=(options.arquivos3mf||[]).filter((a)=>Number(a.id_3mf)===Number(plano.id_3mf));
        const slots:SlotFilamento[]=[];
        for (const linha of linhas3mf) {
          const comp=(options.componentes||[]).find((c)=>Number(c.id_componente_stl)===Number(linha.id_componente_stl));
          if (!comp) continue;
          const nomeStl=String(comp.nome_componente??`STL ${linha.id_componente_stl}`);
          for (let i=1;i<=8;i++) {
            const idFil=Number((comp as Record<string,unknown>)[`id_filamento${i}`]||0);
            const gramas=Number((comp as Record<string,unknown>)[`gramas_filamento_${i}`]||0);
            if (!idFil||gramas<=0) continue;
            const fil=(options.filamentos||[]).find((f)=>Number(f.id_filamento)===idFil);
            const nomeFil=String(fil?.nome_filamento??`Filamento ${idFil}`);
            const cor=fil?.cor_filamento?` ${fil.cor_filamento}`:"";
            slots.push({idFilamento:idFil,nomeFilamento:`${nomeFil}${cor}`,nomeStl,gramas:gramas*Number(linha.qtd_componente||1),gramasPerdido:"",idEstoqueEscolhido:""});
          }
        }
        onRegistrarFalhaStls?.(plano.id_pedido,stlsComFalha,gramasFalhaStl,tempoFalhaStl);
      } else {
        onRegistrarFalhaStls?.(plano.id_pedido,stlsComFalha,gramasFalhaStl,tempoFalhaStl);
      }
      setMostrarFormFalhaStl(false);
      setGramasFalhaStl(""); setTempoFalhaStl(""); setStlsComFalha([]);
                    }}
                    className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-black text-white hover:bg-red-400 disabled:opacity-50">
                    Confirmar falha
                  </button>
                  <button type="button" onClick={()=>setMostrarFormFalhaStl(false)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Modal inline de finalização — seleção de carreteis ── */}
          {aguardaFin&&finalizacaoEmAndamento&&(
            <div className="mx-3 mb-3 rounded-xl border border-emerald-500/40 bg-black/40 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400"/>
                <p className="text-xs font-black text-emerald-300">Selecione o carretel de cada filamento</p>
              </div>
              {finalizacaoEmAndamento.slots.map((slot, idx) => {
                const estoqueDisp = (options?.estoque || [])
                  .filter((e) => Number(e.id_filamento) === slot.idFilamento)
                  .sort((a, b) => Number(b.qtd_estoque_gramas || 0) - Number(a.qtd_estoque_gramas || 0));
                const key = `${slot.nomeStl}_${slot.idFilamento}_${idx}`;
                return (
                  <div key={key} className="space-y-1 border-t border-white/5 pt-2 first:border-0 first:pt-0">
                    <p className="text-[10px] font-black text-slate-300">{slot.nomeStl}</p>
                    <p className="text-[10px] font-bold text-slate-500">
                      {slot.nomeFilamento} — <span className="text-cyan-300">{slot.gramas}g necessários</span>
                    </p>
                    {/* Lista de botões — evita problema do DnD com <select> */}
                    <div className="space-y-1">
                      {estoqueDisp.length === 0 && (
                        <p className="text-[10px] text-red-400">Nenhum estoque disponível</p>
                      )}
                      {estoqueDisp.map((est, j) => {
                        const disponivel = Number(est.qtd_estoque_gramas || 0);
                        const loc = est.localizacao ? ` | ${est.localizacao}` : "";
                        const suficiente = disponivel >= slot.gramas;
                        const estKey = `${est.id_filamento}_${est.localizacao ?? ""}_${j}`;
                        const selecionado = slot.idEstoqueEscolhido === estKey;
                        return (
                          <button
                            key={estKey}
                            type="button"
                            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                            onClick={(e) => { e.stopPropagation(); onFinSlotChange?.(idx, estKey); }}
                            className={`w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-bold transition-colors border ${
                              selecionado
                                ? "border-emerald-400/60 bg-emerald-400/20 text-emerald-300"
                                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            {suficiente ? "✅" : "⚠️"} {disponivel}g disponível{loc}
                          </button>
                        );
                      })}
                    </div>
                    {slot.idEstoqueEscolhido && (()=>{
                      // Extrai o índice do final da key para achar o carretel exato
                      const parts = slot.idEstoqueEscolhido.split("_");
                      const j = Number(parts[parts.length - 1]);
                      const escolhido = !Number.isNaN(j) && j < estoqueDisp.length ? estoqueDisp[j] : null;
                      const disp = Number(escolhido?.qtd_estoque_gramas || 0);
                      if (escolhido && disp < slot.gramas) return <p className="text-[10px] text-amber-400">⚠️ Estoque insuficiente: {disp}g disponível, {slot.gramas}g necessário</p>;
                      return null;
                    })()}
                  </div>
                );
              })}
              <div className="flex gap-2 pt-1">
                <button type="button"
                  disabled={finalizacaoEmAndamento.salvando || finalizacaoEmAndamento.slots.some(s=>!s.idEstoqueEscolhido)}
                  onClick={onFinConfirm}
                  className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed">
                  {finalizacaoEmAndamento.salvando ? "Finalizando..." : "Confirmar e debitar estoque"}
                </button>
                <button type="button" onClick={onFinCancel} disabled={finalizacaoEmAndamento.salvando}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ── Modal de falha com seleção de carretel ── */}
          {aguardaFalhaCarretel&&falhaCarretelEmAndamento&&(
            <div className="mx-3 mb-3 rounded-xl border border-red-500/40 bg-black/40 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400"/>
                <p className="text-xs font-black text-red-300">Registrar falha — selecione o carretel</p>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-red-300/80">Tempo total perdido (min) *</label>
                <input type="number" min="0" value={falhaCarretelEmAndamento.tempoPerdido}
                  onChange={(e)=>onFalhaCarretelTempo?.(e.target.value)} placeholder="Ex.: 120"
                  onPointerDown={(e)=>e.stopPropagation()}
                  className="w-full rounded-lg border border-red-500/30 bg-slate-950/80 px-2 py-1.5 text-xs text-white outline-none focus:border-red-400 placeholder:text-slate-600"/>
              </div>
              {falhaCarretelEmAndamento.slots.map((slot,idx)=>{
                const estoqueDisp=(options?.estoque||[])
                  .filter((e)=>Number(e.id_filamento)===slot.idFilamento)
                  .sort((a,b)=>Number(b.qtd_estoque_gramas||0)-Number(a.qtd_estoque_gramas||0));
                return (
                  <div key={idx} className="space-y-1 border-t border-white/5 pt-2 first:border-0 first:pt-0">
                    <p className="text-[10px] font-black text-slate-300">{slot.nomeStl}</p>
                    <p className="text-[10px] text-slate-500">{slot.nomeFilamento} — referência: <span className="text-slate-400">{slot.gramas}g</span></p>
                    <div className="mb-1">
                      <label className="mb-0.5 block text-[10px] font-bold text-red-300/80">Gramas perdidas neste componente *</label>
                      <input type="number" min="0" step="0.1"
                        value={slot.gramasPerdido}
                        onChange={(e)=>onFalhaCarretelSlotGramas?.(idx,e.target.value)}
                        onPointerDown={(e)=>e.stopPropagation()}
                        placeholder={`Máx. ${slot.gramas}g`}
                        className="w-full rounded-lg border border-red-500/30 bg-slate-950/80 px-2 py-1.5 text-xs text-white outline-none focus:border-red-400 placeholder:text-slate-600"/>
                    </div>
                    <div className="space-y-1">
                      {estoqueDisp.map((est,j)=>{
                        const estKey=`${est.id_filamento}_${est.localizacao??""}_${j}`;
                        const selecionado=slot.idEstoqueEscolhido===estKey;
                        const disp=Number(est.qtd_estoque_gramas||0);
                        return (
                          <button key={estKey} type="button"
                            onPointerDown={(e)=>{e.stopPropagation();e.preventDefault();}}
                            onMouseDown={(e)=>{e.stopPropagation();e.preventDefault();}}
                            onClick={(e)=>{e.stopPropagation();onFalhaCarretelSlotChange?.(idx,estKey);}}
                            className={`w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-bold border transition-colors ${selecionado?"border-red-400/60 bg-red-400/20 text-red-300":"border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>
                            {disp>=slot.gramas?"✅":"⚠️"} {disp}g disponível{est.localizacao?` | ${est.localizacao}`:""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-1">
                <button type="button"
                  disabled={falhaCarretelEmAndamento.salvando||!falhaCarretelEmAndamento.tempoPerdido||falhaCarretelEmAndamento.slots.some(s=>!s.idEstoqueEscolhido||!s.gramasPerdido)}
                  onPointerDown={(e)=>e.stopPropagation()}
                  onClick={(e)=>{e.stopPropagation();onFalhaCarretelConfirm?.();}}
                  className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-black text-white hover:bg-red-400 disabled:opacity-50">
                  {falhaCarretelEmAndamento.salvando?"Salvando...":"Confirmar falha"}
                </button>
                <button type="button" onPointerDown={(e)=>e.stopPropagation()} onClick={(e)=>{e.stopPropagation();onFalhaCarretelCancel?.();}}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10">
                  Cancelar
                </button>
              </div>
            </div>
          )}

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

          {/* Botoes editar/excluir + setas de navegação */}
          {!flutuando&&!aguardaForm&&(
            <>
              <div className="mx-3 mb-2 flex gap-2">
                <button type="button"
                  onPointerDown={(e)=>e.stopPropagation()}
                  onClick={(e)=>{e.stopPropagation();onMover?.(plano.id_pedido,"recuar");}}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-slate-200 active:scale-95">
                  <ChevronLeft className="h-4 w-4"/> Recuar
                </button>
                <button type="button"
                  onPointerDown={(e)=>e.stopPropagation()}
                  onClick={(e)=>{e.stopPropagation();onMover?.(plano.id_pedido,"avancar");}}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-violet-400/30 bg-violet-400/10 px-2 py-2 text-xs font-bold text-violet-300 hover:bg-violet-400/20 active:scale-95">
                  Avancar <ChevronRight className="h-4 w-4"/>
                </button>
              </div>
              <div className="mx-3 mb-3 flex gap-2">
                <button onClick={()=>onEdit?.(plano)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20">
                  <Edit3 className="h-3 w-3"/> Editar
                </button>
                <button onClick={()=>onDelete?.(plano.id_pedido)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-400/30 bg-red-400/10 px-2 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/20">
                  <Trash2 className="h-3 w-3"/> Excluir
                </button>
              </div>
            </>
          )}
        </>
      )}
    </article>
  );
}
