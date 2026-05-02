import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

const TABLE = "execucao_fabric";
const ID_COL = "id_fila";
const FIELDS = ["id_impressora", "ordem_execucao", "id_3mf", "id_pedido", "status_exec", "data_execucao", "hora_ini", "hora_fim"];
const NUMERIC = ["id_impressora", "ordem_execucao", "id_3mf", "id_pedido"];

function sanitize(body: Record<string, unknown>) {
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
  const { data, error } = await supabase.from(TABLE).select("*").order(ID_COL, { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = sanitize(body);
    const { data, error } = await supabase.from(TABLE).insert([payload]).select();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao processar a requisição." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body[ID_COL];
    if (id === undefined || id === null || id === "") return NextResponse.json({ ok: false, error: "ID não informado." }, { status: 400 });
    const payload = sanitize(body);
    const { data, error } = await supabase.from(TABLE).update(payload).eq(ID_COL, id).select();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "ID não informado." }, { status: 400 });
    const { error } = await supabase.from(TABLE).delete().eq(ID_COL, id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao excluir." }, { status: 500 });
  }
}
