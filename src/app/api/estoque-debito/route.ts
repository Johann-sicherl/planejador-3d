import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

/**
 * POST /api/estoque-debito
 *
 * Debita gramas de um registro específico do estoque.
 * Body: { id_filamento: number, gramas: number, localizacao?: string }
 * Usa id_filamento + localizacao para identificar o carretel exato.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idFilamento = Number(body.id_filamento);
    const gramas      = Number(body.gramas);

    if (Number.isNaN(idFilamento) || Number.isNaN(gramas) || gramas <= 0)
      return NextResponse.json({ ok: false, error: "id_filamento e gramas validos sao obrigatorios." }, { status: 400 });

    // Monta query — se tiver localizacao, usa para identificar o carretel exato
    let query = supabase
      .from("estoque_j_ao_cubo")
      .select("id_filamento, qtd_estoque_gramas, localizacao")
      .eq("id_filamento", idFilamento);

    if (body.localizacao && body.localizacao !== "undefined") {
      query = query.eq("localizacao", body.localizacao);
    }

    const { data: registros, error: eFind } = await query;
    if (eFind || !registros?.length)
      return NextResponse.json({ ok: false, error: `Registro de estoque nao encontrado para filamento ${idFilamento}.` }, { status: 404 });

    // Usa o primeiro registro encontrado (já filtrado por localizacao se informada)
    const reg = registros[0];
    const novoValor = Math.max(0, Number((Number(reg.qtd_estoque_gramas || 0) - gramas).toFixed(3)));

    // Atualiza diretamente pelo id_filamento + localizacao
    let updateQuery = supabase
      .from("estoque_j_ao_cubo")
      .update({ qtd_estoque_gramas: novoValor })
      .eq("id_filamento", idFilamento);

    if (reg.localizacao) {
      updateQuery = updateQuery.eq("localizacao", reg.localizacao);
    }

    const { error: eUpdate } = await updateQuery;
    if (eUpdate)
      return NextResponse.json({ ok: false, error: eUpdate.message }, { status: 500 });

    return NextResponse.json({ ok: true, novoValor });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 }
    );
  }
}
