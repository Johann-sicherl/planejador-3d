import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

const TABLE = "cadastro_pedidos";
const ID_COL = "id_pedido";

// Correção cirúrgica: pedido não define mais impressora.
// A impressora passa a ser definida somente no Plano de Produção.
const FIELDS = [
  "id_cliente",
  "id_3mf",
  "data_solic",
  "data_entrega_prevista",
  "data_entrega_realizada",
];

const NUMERIC = ["id_cliente", "id_3mf"];

type Body = Record<string, unknown>;

function sanitize(body: Body) {
  const payload: Record<string, unknown> = {};

  for (const field of FIELDS) {
    const value = body[field];

    if (value === "" || value === undefined) {
      payload[field] = null;
    } else if (NUMERIC.includes(field)) {
      payload[field] = Number(value);
    } else {
      payload[field] = value;
    }
  }

  return payload;
}

export async function GET() {
  const { data: rawData, error } = await supabase
    .from(TABLE)
    .select("id_pedido, id_cliente, id_3mf, data_solic, data_entrega_prevista, data_entrega_realizada")
    .order(ID_COL, { ascending: true });

  // Deduplica por id_pedido caso o Supabase expanda FK automaticamente
  const seen = new Set<number>();
  const data = (rawData || []).filter((row) => {
    const id = Number(row.id_pedido);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = sanitize(body);

    const { data, error } = await supabase.from(TABLE).insert([payload]).select();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Falha ao processar a requisição." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body[ID_COL];

    if (id === undefined || id === null || id === "") {
      return NextResponse.json({ ok: false, error: "ID não informado." }, { status: 400 });
    }

    const payload = sanitize(body);

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq(ID_COL, id)
      .select();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID não informado." }, { status: 400 });
    }

    const { error } = await supabase.from(TABLE).delete().eq(ID_COL, id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao excluir." }, { status: 500 });
  }
}
