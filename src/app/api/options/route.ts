import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

type Row = Record<string, any>;

function safeData<T>(result: { data: T[] | null }) {
  return result.data || [];
}

function firstText(row: Row | undefined, fields: string[], fallback: string) {
  if (!row) return fallback;

  for (const field of fields) {
    const value = row[field];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return fallback;
}

function formatDate(value: unknown) {
  if (!value) return "";

  const text = String(value);
  const [date] = text.split("T");
  const parts = date.split("-");

  if (parts.length !== 3) return text;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function montarLabelFilamento(row: Row) {
  const partes = [
    firstText(row, ["nome_filamento", "nome", "descricao"], ""),
    firstText(row, ["material_filamento", "material"], ""),
    firstText(row, ["nome_fabricante", "fabricante_filamento", "fabricante"], ""),
    firstText(row, ["cor_filamento", "cor"], ""),
  ].filter(Boolean);

  return partes.join(" • ");
}

export async function GET() {
  try {
    const [
      clientes,
      impressoras,
      componentes,
      arquivos3mf,
      filamentos,
      fabricantesFilamentos,
      pedidos,
      execucoes,
      planoProducao,
    ] = await Promise.all([
      supabase.from("cadastro_clientes").select("*").order("id_cliente", { ascending: true }),
      supabase.from("cadastro_impressoras").select("*").order("id_impressora", { ascending: true }),
      supabase.from("cadastro_componentes").select("*").order("id_componente_stl", { ascending: true }),
      supabase.from("cadastro_3mf").select("id_linha, id_3mf, nome_arquivo_3mf, id_componente_stl, qtd_componente").order("id_3mf", { ascending: true }).order("id_linha", { ascending: true }),
      supabase.from("cadastro_filamentos").select("*").order("id_filamento", { ascending: true }),
      supabase.from("cadastro_fabricantes_filamentos").select("*").order("nome_fabricante", { ascending: true }),
      supabase.from("cadastro_pedidos").select("*").order("id_pedido", { ascending: true }),
      supabase.from("execucao_fabric").select("*").order("id_fila", { ascending: true }),
      supabase.from("plano_producao").select("*").order("id_pedido", { ascending: true }),
    ]);

    const errors = [
      clientes.error,
      impressoras.error,
      componentes.error,
      arquivos3mf.error,
      filamentos.error,
      pedidos.error,
      execucoes.error,
      planoProducao.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      return NextResponse.json(
        { ok: false, error: errors[0]?.message || "Falha ao carregar opções." },
        { status: 500 }
      );
    }

    const clientesData = safeData(clientes);
    const impressorasData = safeData(impressoras);
    // Todas as linhas de cadastro_3mf (1 por componente STL)
    const arquivos3mfData = safeData(arquivos3mf);
    const pedidosData = safeData(pedidos);
    const filamentosData = safeData(filamentos);
    const fabricantesFilamentosData = fabricantesFilamentos.error ? [] : safeData(fabricantesFilamentos);

    const fabricanteById = new Map(
      fabricantesFilamentosData.map((row) => [
        Number(row.id_fabricante_filamento ?? row.id_fabricante ?? row.id),
        firstText(row, ["nome_fabricante", "fabricante", "nome"], ""),
      ])
    );

    const filamentosComLabel = filamentosData.map((filamento) => {
      const fabricanteId = Number(
        filamento.id_fabricante_filamento ??
          filamento.id_fabricante ??
          filamento.fabricante_id
      );

      const nomeFabricante = fabricanteById.get(fabricanteId) || "";
      const row = {
        ...filamento,
        nome_fabricante: nomeFabricante,
      };

      return {
        ...row,
        label_filamento: montarLabelFilamento(row),
      };
    });

    const clienteById = new Map(
      clientesData.map((row) => [
        Number(row.id_cliente),
        firstText(row, ["nome_cliente", "cliente", "razao_social", "nome"], "Cliente sem nome"),
      ])
    );

    const impressoraById = new Map(
      impressorasData.map((row) => [
        Number(row.id_impressora),
        firstText(row, ["nome_impressora", "nome", "modelo", "descricao"], "Impressora sem nome"),
      ])
    );

    const arquivoById = new Map(
      arquivos3mfData.map((row) => [
        Number(row.id_3mf),
        firstText(row, ["nome_arquivo_3mf", "nome_arquivo", "filename", "arquivo", "descricao"], "Arquivo 3MF sem nome"),
      ])
    );

    const pedidosComLabel = pedidosData.map((pedido) => {
      const cliente = clienteById.get(Number(pedido.id_cliente));
      const impressora = impressoraById.get(Number(pedido.id_impressora));
      const arquivo = arquivoById.get(Number(pedido.id_3mf));
      const numero = firstText(pedido, ["numero_pedido", "codigo_pedido", "nome_pedido", "pedido"], "");
      const entrega = formatDate(pedido.data_entrega_prevista);

      const partes = [
        numero || cliente || arquivo || "Pedido cadastrado",
        arquivo,
        impressora,
        entrega ? `Entrega ${entrega}` : "",
      ].filter(Boolean);

      return {
        ...pedido,
        label_pedido: partes.join(" • "),
      };
    });

    return NextResponse.json({
      ok: true,
      data: [
        {
          clientes: clientesData,
          impressoras: impressorasData,
          componentes: safeData(componentes),
          arquivos3mf: arquivos3mfData,
          filamentos: filamentosComLabel,
          fabricantesFilamentos: fabricantesFilamentosData,
          pedidos: pedidosComLabel,
          execucoes: safeData(execucoes),
          planoProducao: safeData(planoProducao),
        },
      ],
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Falha ao carregar opções." },
      { status: 500 }
    );
  }
}
