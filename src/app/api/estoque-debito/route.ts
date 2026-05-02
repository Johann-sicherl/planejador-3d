import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idFilamento = Number(body.id_filamento);
    const gramas      = Number(body.gramas);

    if (Number.isNaN(idFilamento) || Number.isNaN(gramas) || gramas <= 0)
      return NextResponse.json({ ok: false, error: "id_filamento e gramas validos sao obrigatorios." }, { status: 400 });

    // Busca o registro exato pelo id_filamento + localizacao
    let query = supabase
      .from("estoque_j_ao_cubo")
      .select("id_filamento, qtd_estoque_gramas, peso_com_carretel_g, localizacao")
      .eq("id_filamento", idFilamento);

    if (body.localizacao && body.localizacao !== "undefined" && body.localizacao !== "0") {
      query = query.eq("localizacao", body.localizacao);
    }

    const { data: registros, error: eFind } = await query;
    if (eFind || !registros?.length)
      return NextResponse.json({ ok: false, error: `Registro nao encontrado para filamento ${idFilamento}.` }, { status: 404 });

    const reg = registros[0];

    // Calcula novos valores — debita das DUAS colunas
    const novoQtd   = Math.max(0, Number((Number(reg.qtd_estoque_gramas   || 0) - gramas).toFixed(3)));
    const novoBruto = Math.max(0, Number((Number(reg.peso_com_carretel_g  || 0) - gramas).toFixed(3)));

    // Atualiza ambas as colunas
    let updateQuery = supabase
      .from("estoque_j_ao_cubo")
      .update({
        qtd_estoque_gramas:  novoQtd,
        peso_com_carretel_g: novoBruto,
      })
      .eq("id_filamento", idFilamento);

    if (reg.localizacao) {
      updateQuery = updateQuery.eq("localizacao", reg.localizacao);
    }

    const { error: eUpdate } = await updateQuery;
    if (eUpdate)
      return NextResponse.json({ ok: false, error: eUpdate.message }, { status: 500 });

    return NextResponse.json({ ok: true, novoQtd, novoBruto });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 }
    );
  }
}
