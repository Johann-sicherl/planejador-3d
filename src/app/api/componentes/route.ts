import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

const TABLE = "cadastro_componentes";
const ID_COL = "id_componente_stl";
const FIELDS = ["nome_componente", "id_filamento1", "id_filamento2", "id_filamento3", "id_filamento4", "id_filamento5", "id_filamento6", "id_filamento7", "id_filamento8", "gramas_filamento_1", "gramas_filamento_2", "gramas_filamento_3", "gramas_filamento_4", "gramas_filamento_5", "gramas_filamento_6", "gramas_filamento_7", "gramas_filamento_8", "tempo_impressao_min"];
const NUMERIC = ["id_filamento1", "id_filamento2", "id_filamento3", "id_filamento4", "id_filamento5", "id_filamento6", "id_filamento7", "id_filamento8", "gramas_filamento_1", "gramas_filamento_2", "gramas_filamento_3", "gramas_filamento_4", "gramas_filamento_5", "gramas_filamento_6", "gramas_filamento_7", "gramas_filamento_8", "tempo_impressao_min"];

const PAGE_LIMIT_DEFAULT = 100;

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

export async function GET(request: NextRequest) {
  // Fix #7 — Paginação via ?page=N&limit=N (padrão: limit=100, sem offset = tudo de uma vez).
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const pageParam  = url.searchParams.get("page");

  const limit = limitParam ? Math.max(1, Math.min(500, Number(limitParam))) : PAGE_LIMIT_DEFAULT;
  const page  = pageParam  ? Math.max(1, Number(pageParam)) : 1;
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;

  const { data, error, count } = await supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order(ID_COL, { ascending: true })
    .range(from, to);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data, total: count, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const requiredValue = String(body.nome_componente ?? "").trim();
    if (!requiredValue) return NextResponse.json({ ok: false, error: "O campo nome_componente é obrigatório." }, { status: 400 });
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
