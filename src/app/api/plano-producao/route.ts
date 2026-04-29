import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const TABLE = "plano_producao";
const ID_COL = "id_pedido";

const FIELDS = [
  "id_pedido",
  "id_impressora",
  "id_3mf",
  "tempo_impressao_min",
  "status_producao",
  "ordem_fila",
  "prioridade",
  "progresso",
  "peso_estimado_g",
];

const NUMERIC = [
  "id_pedido",
  "id_impressora",
  "id_3mf",
  "tempo_impressao_min",
  "ordem_fila",
  "progresso",
  "peso_estimado_g",
];

function sanitize(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};

  for (const field of FIELDS) {
    const value = body[field];

    if (value === "" || value === undefined) {
      continue;
    }

    if (value === null) {
      payload[field] = null;
    } else if (NUMERIC.includes(field)) {
      const parsed = Number(value);
      payload[field] = Number.isNaN(parsed) ? null : parsed;
    } else {
      payload[field] = value;
    }
  }

  return payload;
}

export async function GET() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("ordem_fila", { ascending: true, nullsFirst: false })
    .order(ID_COL, { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = sanitize(body);

    if (!payload.id_pedido) {
      return NextResponse.json(
        { ok: false, error: "Informe o pedido para adicionar ao plano de produção." },
        { status: 400 }
      );
    }

    if (!payload.status_producao) payload.status_producao = "pedidos";
    if (payload.progresso === undefined) payload.progresso = 0;

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
    delete payload[ID_COL];

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
