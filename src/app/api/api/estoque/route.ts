import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

const TABLE = "estoque_j_ao_cubo";
const ID_COL = "id_filamento";
const FIELDS = ["id_filamento", "qtd_estoque_gramas", "localizacao", "peso_com_carretel_g", "id_carretel"];
const NUMERIC = ["id_filamento", "qtd_estoque_gramas", "peso_com_carretel_g", "id_carretel"];

function sanitize(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = body[field];
    if (value === "" || value === undefined || value === null) {
      payload[field] = null;
    } else if (NUMERIC.includes(field)) {
      const parsed = Number(value);
      payload[field] = Number.isNaN(parsed) ? null : parsed;
    } else {
      payload[field] = String(value).trim() || null;
    }
  }
  return payload;
}

export async function GET() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*, carretel:cadastro_pesos_carreteis ( id_carretel, marca_carretel, peso_carretel_g )")
    .order(ID_COL, { ascending: true });
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
    return NextResponse.json({ ok: false, error: "Falha ao processar a requisicao." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body[ID_COL];
    if (id === undefined || id === null || id === "")
      return NextResponse.json({ ok: false, error: "ID nao informado." }, { status: 400 });
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
    if (!id) return NextResponse.json({ ok: false, error: "ID nao informado." }, { status: 400 });
    const { error } = await supabase.from(TABLE).delete().eq(ID_COL, id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao excluir." }, { status: 500 });
  }
}
