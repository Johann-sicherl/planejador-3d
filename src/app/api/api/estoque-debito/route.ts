import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

/**
 * POST /api/estoque-debito
 *
 * Debita gramas de um ou mais filamentos no estoque.
 * Aceita dois modos:
 *
 * Modo 1 — finalizado (debita todos os filamentos do componente):
 *   { id_3mf: number, qtd_componente?: number }
 *   Busca o componente vinculado ao 3MF e debita gramas_filamento_1..8
 *   proporcionalmente à qtd_componente.
 *
 * Modo 2 — falha (debita somente material perdido em um filamento):
 *   { id_filamento: number, gramas: number }
 *   Debita diretamente do filamento informado.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Modo 2: falha — debita filamento principal ──────────────
    if (body.id_filamento !== undefined && body.gramas !== undefined) {
      const idFilamento = Number(body.id_filamento);
      const gramas      = Number(body.gramas);
      if (Number.isNaN(idFilamento) || Number.isNaN(gramas) || gramas <= 0)
        return NextResponse.json({ ok: false, error: "id_filamento e gramas validos sao obrigatorios." }, { status: 400 });

      const { error } = await supabase.rpc("debitar_estoque", {
        p_id_filamento: idFilamento,
        p_gramas:       gramas,
      });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // ── Modo 1: finalizado — debita todos os filamentos do componente ──
    const id3mf = Number(body.id_3mf);
    if (Number.isNaN(id3mf))
      return NextResponse.json({ ok: false, error: "id_3mf invalido." }, { status: 400 });

    // 1. Busca o arquivo 3MF para obter id_componente_stl e qtd_componente
    const { data: arq3mf, error: e1 } = await supabase
      .from("cadastro_3mf")
      .select("id_componente_stl, qtd_componente")
      .eq("id_3mf", id3mf)
      .single();
    if (e1 || !arq3mf)
      return NextResponse.json({ ok: false, error: `Arquivo 3MF ${id3mf} nao encontrado.` }, { status: 404 });

    const qtd = Number(body.qtd_componente ?? arq3mf.qtd_componente ?? 1);

    // 2. Busca o componente para obter consumo por filamento
    const { data: comp, error: e2 } = await supabase
      .from("cadastro_componentes")
      .select(`
        id_filamento1, gramas_filamento_1,
        id_filamento2, gramas_filamento_2,
        id_filamento3, gramas_filamento_3,
        id_filamento4, gramas_filamento_4,
        id_filamento5, gramas_filamento_5,
        id_filamento6, gramas_filamento_6,
        id_filamento7, gramas_filamento_7,
        id_filamento8, gramas_filamento_8
      `)
      .eq("id_componente_stl", arq3mf.id_componente_stl)
      .single();
    if (e2 || !comp)
      return NextResponse.json({ ok: false, error: `Componente ${arq3mf.id_componente_stl} nao encontrado.` }, { status: 404 });

    // 3. Para cada slot de filamento com consumo > 0, debita no estoque
    const erros: string[] = [];
    for (let i = 1; i <= 8; i++) {
      const idFil  = (comp as Record<string, unknown>)[`id_filamento${i}`];
      const gramas = (comp as Record<string, unknown>)[`gramas_filamento_${i}`];
      if (!idFil || !gramas) continue;
      const total = Number(gramas) * qtd;
      if (total <= 0) continue;

      const { error: eDebito } = await supabase.rpc("debitar_estoque", {
        p_id_filamento: Number(idFil),
        p_gramas:       total,
      });
      if (eDebito) erros.push(`Filamento ${idFil}: ${eDebito.message}`);
    }

    if (erros.length > 0)
      return NextResponse.json({ ok: false, error: erros.join(" | ") }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 }
    );
  }
}
