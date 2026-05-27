import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idFilamento = Number(body.id_filamento);
    const gramas      = Number(body.gramas);
    const idx         = body.idx !== undefined ? Number(body.idx) : null;

    if (Number.isNaN(idFilamento) || Number.isNaN(gramas) || gramas <= 0)
      return NextResponse.json({ ok: false, error: "id_filamento e gramas válidos são obrigatórios." }, { status: 400 });

    // Fix #2 — Seleciona id_estoque (PK) para evitar race condition.
    // Antes, o UPDATE usava peso_com_carretel_g como identificador, o que
    // quebrava se dois requests simultâneos lessem o mesmo valor antes de um deles atualizar.
    let query = supabase
      .from("estoque_j_ao_cubo")
      .select("id_estoque, id_filamento, qtd_estoque_gramas, peso_com_carretel_g, localizacao")
      .eq("id_filamento", idFilamento)
      .order("qtd_estoque_gramas", { ascending: false });

    if (body.localizacao) {
      query = query.eq("localizacao", body.localizacao);
    }

    const { data: registros, error: eFind } = await query;
    if (eFind) {
      return NextResponse.json(
        { ok: false, error: `Erro ao buscar estoque do filamento ${idFilamento}: ${eFind.message}` },
        { status: 500 }
      );
    }
    if (!registros?.length) {
      return NextResponse.json(
        {
          ok: false,
          error: `Nenhum carretel encontrado para o filamento ID ${idFilamento}${body.localizacao ? ` na localização "${body.localizacao}"` : ""}. Verifique se o filamento possui estoque cadastrado.`,
        },
        { status: 404 }
      );
    }

    const reg = idx !== null && idx < registros.length ? registros[idx] : registros[0];

    const novoQtd   = Math.max(0, Number((Number(reg.qtd_estoque_gramas   || 0) - gramas).toFixed(3)));
    const novoBruto = Math.max(0, Number((Number(reg.peso_com_carretel_g  || 0) - gramas).toFixed(3)));

    // Fix #2 — Atualiza pela chave primária id_estoque (atômico e sem race condition).
    const { error: eUpdate } = await supabase
      .from("estoque_j_ao_cubo")
      .update({ qtd_estoque_gramas: novoQtd, peso_com_carretel_g: novoBruto })
      .eq("id_estoque", reg.id_estoque);

    if (eUpdate) {
      return NextResponse.json(
        { ok: false, error: `Erro ao atualizar carretel ${reg.id_estoque}: ${eUpdate.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, novoQtd, novoBruto });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro interno ao debitar estoque." },
      { status: 500 }
    );
  }
}
