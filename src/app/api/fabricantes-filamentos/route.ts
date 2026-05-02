import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

const TABLE = "cadastro_fabricantes_filamentos";
const ID_COL = "id_fabricante_filamento";

function sanitize(body: Record<string, unknown>) {
  return {
    nome_fabricante: String(body.nome_fabricante ?? "").trim() || null,
    site_fabricante: String(body.site_fabricante ?? "").trim() || null,
    observacoes: String(body.observacoes ?? "").trim() || null,
    ativo: body.ativo === false ? false : true,
  };
}

export async function GET() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("nome_fabricante", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = sanitize(body);

    if (!payload.nome_fabricante) {
      return NextResponse.json(
        { ok: false, error: "O campo nome_fabricante é obrigatório." },
        { status: 400 }
      );
    }

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

    if (!payload.nome_fabricante) {
      return NextResponse.json(
        { ok: false, error: "O campo nome_fabricante é obrigatório." },
        { status: 400 }
      );
    }

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
