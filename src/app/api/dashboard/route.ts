import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    const [
      clientes,
      filamentos,
      componentes,
      impressoras,
      pedidos,
      execucoes,
      falhas,
      cotacoes,
      estoque,
    ] = await Promise.all([
      supabase.from("cadastro_clientes").select("*", { count: "exact", head: true }),
      supabase.from("cadastro_filamentos").select("*", { count: "exact", head: true }),
      supabase.from("cadastro_componentes").select("*", { count: "exact", head: true }),
      supabase.from("cadastro_impressoras").select("*", { count: "exact", head: true }),
      supabase.from("cadastro_pedidos").select("*", { count: "exact", head: true }),
      supabase.from("execucao_fabric").select("status_exec"),
      supabase.from("falhas_producao").select("*", { count: "exact", head: true }),
      supabase.from("cotacao_componente").select("*", { count: "exact", head: true }),
      supabase.from("estoque_j_ao_cubo").select("qtd_estoque_gramas"),
    ]);

    const execs = execucoes.data || [];
    const emProducao = execs.filter((e) => String(e.status_exec || "").toUpperCase() === "EM_PRODUCAO").length;
    const finalizadas = execs.filter((e) => String(e.status_exec || "").toUpperCase() === "FINALIZADO").length;
    const pendentes = execs.filter((e) => String(e.status_exec || "").toUpperCase() === "PENDENTE").length;
    const estoqueTotal = (estoque.data || []).reduce((acc, item) => acc + Number(item.qtd_estoque_gramas || 0), 0);

    return NextResponse.json({
      ok: true,
      data: [{
        total_clientes: clientes.count || 0,
        total_filamentos: filamentos.count || 0,
        total_componentes: componentes.count || 0,
        total_impressoras: impressoras.count || 0,
        total_pedidos: pedidos.count || 0,
        total_execucoes: execs.length,
        execucoes_em_producao: emProducao,
        execucoes_finalizadas: finalizadas,
        execucoes_pendentes: pendentes,
        total_falhas: falhas.count || 0,
        total_cotacoes: cotacoes.count || 0,
        estoque_total_gramas: estoqueTotal,
      }],
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao gerar dashboard." }, { status: 500 });
  }
}
