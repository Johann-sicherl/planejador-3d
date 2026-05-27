import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

/**
 * Fix #15 — Endpoint server-side para calcular peso e tempo de um pedido.
 * Elimina a duplicação de lógica entre frontend e backend.
 *
 * GET /api/peso-pedido?id_pedido=X
 * Retorna: { ok, peso_g, tempo_min, filamentos: [{id, nome, gramas}] }
 */
export async function GET(request: NextRequest) {
  try {
    const url       = new URL(request.url);
    const idPedido  = url.searchParams.get("id_pedido");
    const id3mf     = url.searchParams.get("id_3mf"); // alternativa: calcular por 3MF direto

    if (!idPedido && !id3mf) {
      return NextResponse.json({ ok: false, error: "Informe id_pedido ou id_3mf." }, { status: 400 });
    }

    // 1. Descobre quais 3MFs pertencem ao pedido
    let ids3mf: number[] = [];
    if (idPedido) {
      const { data: p3mfs } = await supabase
        .from("pedido_3mfs")
        .select("id_3mf")
        .eq("id_pedido", Number(idPedido));
      ids3mf = (p3mfs || []).map((r) => Number(r.id_3mf));

      // Fallback: campo id_3mf na tabela de pedidos
      if (!ids3mf.length) {
        const { data: ped } = await supabase
          .from("cadastro_pedidos")
          .select("id_3mf")
          .eq("id_pedido", Number(idPedido))
          .single();
        if (ped?.id_3mf) ids3mf = [Number(ped.id_3mf)];
      }
    } else if (id3mf) {
      ids3mf = [Number(id3mf)];
    }

    if (!ids3mf.length) {
      return NextResponse.json({ ok: true, peso_g: 0, tempo_min: 0, filamentos: [] });
    }

    // 2. Busca linhas de componentes dos 3MFs
    const { data: linhas3mf } = await supabase
      .from("cadastro_3mf")
      .select("id_componente_stl, qtd_componente")
      .in("id_3mf", ids3mf);

    if (!linhas3mf?.length) {
      return NextResponse.json({ ok: true, peso_g: 0, tempo_min: 0, filamentos: [] });
    }

    // 3. Busca componentes únicos
    const idsComp = [...new Set(linhas3mf.map((l) => Number(l.id_componente_stl)).filter(Boolean))];
    const { data: componentes } = await supabase
      .from("cadastro_componentes")
      .select("*")
      .in("id_componente_stl", idsComp);

    // 4. Busca filamentos únicos para labels
    const idsFil: number[] = [];
    for (const c of componentes || []) {
      for (let i = 1; i <= 8; i++) {
        const idF = Number((c as Record<string, unknown>)[`id_filamento${i}`] || 0);
        if (idF && !idsFil.includes(idF)) idsFil.push(idF);
      }
    }
    const { data: filamentos } = idsFil.length
      ? await supabase.from("cadastro_filamentos").select("id_filamento, nome_filamento, cor_filamento").in("id_filamento", idsFil)
      : { data: [] };

    const filPorId = new Map((filamentos || []).map((f) => [Number(f.id_filamento), f]));
    const compPorId = new Map((componentes || []).map((c) => [Number((c as Record<string,unknown>).id_componente_stl), c]));

    // 5. Calcula peso total, tempo total e acumula por filamento
    let pesoTotal  = 0;
    let tempoTotal = 0;
    const filAcc   = new Map<number, { nome: string; gramas: number }>();

    for (const linha of linhas3mf) {
      const comp = compPorId.get(Number(linha.id_componente_stl));
      if (!comp) continue;
      const qtd = Number(linha.qtd_componente || 1);
      tempoTotal += Number((comp as Record<string,unknown>).tempo_impressao_min || 0) * qtd;

      for (let i = 1; i <= 8; i++) {
        const idF    = Number((comp as Record<string,unknown>)[`id_filamento${i}`] || 0);
        const gramas = Number((comp as Record<string,unknown>)[`gramas_filamento_${i}`] || 0);
        if (!idF || gramas <= 0) continue;
        const fil   = filPorId.get(idF);
        const nome  = fil
          ? `${fil.nome_filamento ?? ""}${fil.cor_filamento ? ` · ${fil.cor_filamento}` : ""}`
          : `Filamento ${idF}`;
        const total = gramas * qtd;
        pesoTotal  += total;
        const prev  = filAcc.get(idF);
        filAcc.set(idF, { nome, gramas: Number(((prev?.gramas || 0) + total).toFixed(3)) });
      }
    }

    return NextResponse.json({
      ok:       true,
      peso_g:   Number(pesoTotal.toFixed(3)),
      tempo_min: Math.round(tempoTotal),
      filamentos: Array.from(filAcc.entries()).map(([id, v]) => ({ id, nome: v.nome, gramas: v.gramas })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 },
    );
  }
}
