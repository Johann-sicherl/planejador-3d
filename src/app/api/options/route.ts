import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    const [clientes, impressoras, componentes, arquivos3mf, filamentos, pedidos, execucoes] = await Promise.all([
      supabase.from("cadastro_clientes").select("id_cliente,nome_cliente").order("id_cliente", { ascending: true }),
      supabase.from("cadastro_impressoras").select("id_impressora,nome_impressora").order("id_impressora", { ascending: true }),
      supabase.from("cadastro_componentes").select("id_componente_stl,nome_componente").order("id_componente_stl", { ascending: true }),
      supabase.from("cadastro_3mf").select("id_3mf,nome_arquivo_3mf").order("id_3mf", { ascending: true }),
      supabase.from("cadastro_filamentos").select("id_filamento,nome_filamento").order("id_filamento", { ascending: true }),
      supabase.from("cadastro_pedidos").select("id_pedido").order("id_pedido", { ascending: true }),
      supabase.from("execucao_fabric").select("id_fila").order("id_fila", { ascending: true }),
    ]);

    return NextResponse.json({
      ok: true,
      data: [{
        clientes: clientes.data || [],
        impressoras: impressoras.data || [],
        componentes: componentes.data || [],
        arquivos3mf: arquivos3mf.data || [],
        filamentos: filamentos.data || [],
        pedidos: pedidos.data || [],
        execucoes: execucoes.data || [],
      }],
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao carregar opções." }, { status: 500 });
  }
}
