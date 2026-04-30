import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

type Row = Record<string, unknown>;

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

export async function GET() {
  try {
    const [
      clientes,
      impressoras,
      componentes,
      arquivos3mf,
      filamentos,
      pedidos,
      execucoes,
      planoProducao,
    ] = await Promise.all([
      supabase.from("cadastro_clientes").select("*").order("id_cliente", { ascending: true }),
      supabase.from("cadastro_impressoras").select("*").order("id_impressora", { ascending: true }),
      supabase.from("cadastro_componentes").select("*").order("id_componente_stl", { ascending: true }),
      supabase.from("cadastro_3mf").select("*").order("id_3mf", { ascending: true }),
      supabase.from("cadastro_filamentos").select("*").order("id_filamento", { ascending: true }),
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

    const clientesData = safeData<Row>(clientes);
    const impressorasData = safeData<Row>(impressoras);
    const arquivos3mfData = safeData<Row>(arquivos3mf);
    const pedidosData = safeData<Row>(pedidos);

    const clienteById = new Map(
      clientesData.map((row) => [
        Number(row.id_cliente),
        firstText(row, ["nome_cliente", "cliente", "razao_social", "nome"], "Cliente sem nome"),
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
      const arquivo = arquivoById.get(Number(pedido.id_3mf));
      const numero = firstText(pedido, ["numero_pedido", "codigo_pedido", "nome_pedido", "pedido"], "");
      const entrega = formatDate(pedido.data_entrega_prevista);

      // Correção cirúrgica: a label do pedido não contém impressora.
      // A impressora pertence somente ao Plano de Produção.
      const partes = [
        numero || cliente || arquivo || "Pedido cadastrado",
        cliente,
        arquivo,
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
          filamentos: safeData(filamentos),
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
