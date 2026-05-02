import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

const TABLE = "cadastro_pesos_carreteis";
const ID_COL = "id_carretel";
const FIELDS = ["marca_carretel", "peso_carretel_g"];
const NUMERIC = ["peso_carretel_g"];

function sanitize(body: Record<string, unknown>) {
  const payload: Record<string, string | number | null> = {};
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
    .select("*")
    .order(ID_COL, { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!String(body.marca_carretel ?? "").trim()) {
      return NextResponse.json(
        { ok: false, error: "O campo marca_carretel é obrigatório." },
        { status: 400 }
      );
    }
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
    if (!id) return NextResponse.json({ ok: false, error: "ID não informado." }, { status: 400 });
    const payload = sanitize(body);
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq(ID_COL, id)
      .select();
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
