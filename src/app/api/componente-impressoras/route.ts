import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

const TABLE = "componente_impressoras";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const idComp = url.searchParams.get("id_componente_stl");
  let query = supabase.from(TABLE).select("*").order("id_comp_imp", { ascending: true });
  if (idComp) query = query.eq("id_componente_stl", idComp);
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows = Array.isArray(body) ? body : [body];
    const payload = rows.map((r) => ({
      id_componente_stl:  Number(r.id_componente_stl),
      id_impressora:      Number(r.id_impressora),
      tempo_impressao_min: Number(r.tempo_impressao_min) || 0,
    }));
    const { data, error } = await supabase.from(TABLE).insert(payload).select();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao processar." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id_comp_imp;
    if (!id) return NextResponse.json({ ok: false, error: "id_comp_imp não informado." }, { status: 400 });
    const { data, error } = await supabase
      .from(TABLE)
      .update({ tempo_impressao_min: Number(body.tempo_impressao_min) || 0 })
      .eq("id_comp_imp", id)
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
    const idComp = url.searchParams.get("id_componente_stl");
    if (id) {
      const { error } = await supabase.from(TABLE).delete().eq("id_comp_imp", id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else if (idComp) {
      const { error } = await supabase.from(TABLE).delete().eq("id_componente_stl", idComp);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ ok: false, error: "Informe id ou id_componente_stl." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao excluir." }, { status: 500 });
  }
}
