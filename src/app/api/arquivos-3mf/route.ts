import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const TABLE  = "cadastro_3mf";
const ID_COL = "id_3mf";

export async function GET() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order(ID_COL, { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

/**
 * POST — cria todas as linhas de um arquivo 3MF de uma vez.
 * Body: { nome_arquivo_3mf: string, componentes: { id_componente_stl: number, qtd_componente: number }[] }
 * Todos os registros recebem o mesmo nome_arquivo_3mf.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nome = String(body.nome_arquivo_3mf ?? "").trim();
    if (!nome) return NextResponse.json({ ok: false, error: "nome_arquivo_3mf é obrigatório." }, { status: 400 });

    const componentes: { id_componente_stl: number; qtd_componente: number }[] = body.componentes || [];
    if (componentes.length === 0)
      return NextResponse.json({ ok: false, error: "Adicione ao menos 1 componente STL." }, { status: 400 });

    const rows = componentes.map((c) => ({
      nome_arquivo_3mf:  nome,
      id_componente_stl: Number(c.id_componente_stl),
      qtd_componente:    Number(c.qtd_componente) || 1,
    }));

    const { data, error } = await supabase.from(TABLE).insert(rows).select();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao processar." }, { status: 500 });
  }
}

/**
 * PUT — atualiza uma linha específica pelo id_3mf.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body[ID_COL];
    if (!id) return NextResponse.json({ ok: false, error: "ID não informado." }, { status: 400 });
    const payload: Record<string, unknown> = {
      nome_arquivo_3mf:  body.nome_arquivo_3mf  ?? null,
      id_componente_stl: body.id_componente_stl ? Number(body.id_componente_stl) : null,
      qtd_componente:    body.qtd_componente    ? Number(body.qtd_componente)    : null,
    };
    const { data, error } = await supabase.from(TABLE).update(payload).eq(ID_COL, id).select();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao atualizar." }, { status: 500 });
  }
}

/**
 * DELETE — exclui todas as linhas do mesmo nome (arquivo inteiro) ou só 1 linha (id).
 * ?id=X        → exclui apenas a linha X
 * ?nome=XYZ    → exclui todas as linhas do arquivo XYZ
 */
export async function DELETE(request: NextRequest) {
  try {
    const url  = new URL(request.url);
    const id   = url.searchParams.get("id");
    const nome = url.searchParams.get("nome");
    if (id) {
      const { error } = await supabase.from(TABLE).delete().eq(ID_COL, id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else if (nome) {
      const { error } = await supabase.from(TABLE).delete().eq("nome_arquivo_3mf", nome);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ ok: false, error: "Informe id ou nome." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao excluir." }, { status: 500 });
  }
}
