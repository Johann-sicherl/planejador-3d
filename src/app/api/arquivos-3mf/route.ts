import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

const TABLE = "cadastro_3mf";

export async function GET() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id_linha, id_3mf, nome_arquivo_3mf, id_componente_stl, qtd_componente")
    .order("id_3mf", { ascending: true })
    .order("id_linha", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

/**
 * POST — insere todas as linhas de um arquivo 3MF de uma vez.
 * Gera um id_3mf único para o arquivo usando a sequência cadastro_3mf_arquivo_seq.
 * Body: { nome_arquivo_3mf: string, componentes: { id_componente_stl: number, qtd_componente: number }[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nome = String(body.nome_arquivo_3mf ?? "").trim();
    if (!nome)
      return NextResponse.json({ ok: false, error: "nome_arquivo_3mf é obrigatório." }, { status: 400 });

    const componentes: { id_componente_stl: number; qtd_componente: number }[] = body.componentes || [];
    if (!componentes.length)
      return NextResponse.json({ ok: false, error: "Adicione ao menos 1 componente STL." }, { status: 400 });

    // Obtém o próximo id_3mf da sequência
    const { data: seqData, error: seqError } = await supabase
      .rpc("nextval", { seq: "cadastro_3mf_arquivo_seq" });

    let novoId3mf: number;
    if (seqError || !seqData) {
      // Fallback: usa max(id_3mf) + 1
      const { data: maxData } = await supabase
        .from(TABLE)
        .select("id_3mf")
        .order("id_3mf", { ascending: false })
        .limit(1)
        .single();
      novoId3mf = (Number(maxData?.id_3mf) || 0) + 1;
    } else {
      novoId3mf = Number(seqData);
    }

    const rows = componentes.map((c) => ({
      id_3mf:            novoId3mf,
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
 * PUT — atualiza uma linha específica pelo id_linha (PK).
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const idLinha = body.id_linha;
    if (!idLinha)
      return NextResponse.json({ ok: false, error: "id_linha não informado." }, { status: 400 });

    const payload: Record<string, unknown> = {};
    if (body.nome_arquivo_3mf  !== undefined) payload.nome_arquivo_3mf  = body.nome_arquivo_3mf  || null;
    if (body.id_componente_stl !== undefined) payload.id_componente_stl = body.id_componente_stl ? Number(body.id_componente_stl) : null;
    if (body.qtd_componente    !== undefined) payload.qtd_componente    = body.qtd_componente    ? Number(body.qtd_componente)    : null;

    const { data, error } = await supabase
      .from(TABLE).update(payload).eq("id_linha", idLinha).select();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao atualizar." }, { status: 500 });
  }
}

/**
 * DELETE
 * ?id_linha=X  → remove apenas aquela linha
 * ?id_3mf=X    → remove todas as linhas do arquivo (pelo id_3mf pai)
 */
export async function DELETE(request: NextRequest) {
  try {
    const url     = new URL(request.url);
    const idLinha = url.searchParams.get("id_linha");
    const id3mf   = url.searchParams.get("id_3mf");

    if (idLinha) {
      const { error } = await supabase.from(TABLE).delete().eq("id_linha", idLinha);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else if (id3mf) {
      const { error } = await supabase.from(TABLE).delete().eq("id_3mf", id3mf);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ ok: false, error: "Informe id_linha ou id_3mf." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao excluir." }, { status: 500 });
  }
}
