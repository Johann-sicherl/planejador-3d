import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

const TABLE = "pedido_3mfs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const idPedido = url.searchParams.get("id_pedido");
  let query = supabase.from(TABLE).select("*").order("id_pedido_3mf", { ascending: true });
  if (idPedido) query = query.eq("id_pedido", idPedido);
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows = Array.isArray(body) ? body : [body];
    const payload = rows.map((r) => ({
      id_pedido: Number(r.id_pedido),
      id_3mf:    Number(r.id_3mf),
    }));
    const { data, error } = await supabase.from(TABLE).insert(payload).select();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao processar." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const idPedido = url.searchParams.get("id_pedido");
    if (id) {
      const { error } = await supabase.from(TABLE).delete().eq("id_pedido_3mf", id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else if (idPedido) {
      const { error } = await supabase.from(TABLE).delete().eq("id_pedido", idPedido);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ ok: false, error: "Informe id ou id_pedido." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao excluir." }, { status: 500 });
  }
}
