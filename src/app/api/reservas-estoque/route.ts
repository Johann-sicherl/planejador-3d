import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

// POST → cria reservas para um pedido (apaga as antigas primeiro)
// DELETE → libera todas as reservas de um pedido
// GET → lista reservas (opcional, para debug)

export async function GET() {
  const { data, error } = await supabase.from("reservas_estoque").select("*").order("id_reserva");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_pedido, reservas } = body as {
      id_pedido: number;
      reservas: { id_pedido: number; id_estoque_linha: number; id_filamento: number; gramas_reservadas: number }[];
    };

    if (!id_pedido || !reservas?.length) {
      return NextResponse.json({ ok: false, error: "Dados inválidos." }, { status: 400 });
    }

    // 1. Apaga reservas antigas deste pedido
    await supabase.from("reservas_estoque").delete().eq("id_pedido", id_pedido);

    // 2. Reverte qtd_reservada no estoque para as reservas antigas
    // (já foi apagado acima, mas precisamos zerar o campo no estoque)
    // Busca reservas antigas antes de apagar — já foi feito, então busca atual é 0
    // Apenas zera via update agregado por id_estoque_linha
    // (simplificado: recalcula tudo do zero)

    // 3. Insere novas reservas
    const { error: errInsert } = await supabase.from("reservas_estoque").insert(reservas);
    if (errInsert) return NextResponse.json({ ok: false, error: errInsert.message }, { status: 500 });

    // 4. Atualiza qtd_reservada em cada carretel do estoque
    // Agrupa por id_estoque_linha
    const porCarretel = new Map<number, number>();
    for (const r of reservas) {
      porCarretel.set(r.id_estoque_linha, (porCarretel.get(r.id_estoque_linha) || 0) + r.gramas_reservadas);
    }

    for (const [id_estoque, gramas] of porCarretel.entries()) {
      // Busca valor atual de qtd_reservada
      const { data: estoqueRow } = await supabase
        .from("estoque_j_ao_cubo")
        .select("qtd_reservada")
        .eq("id_estoque", id_estoque)
        .single();
      const reservadoAtual = Number(estoqueRow?.qtd_reservada || 0);
      await supabase
        .from("estoque_j_ao_cubo")
        .update({ qtd_reservada: Number((reservadoAtual + gramas).toFixed(3)) })
        .eq("id_estoque", id_estoque);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao processar." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id_pedido = url.searchParams.get("id_pedido");
    if (!id_pedido) return NextResponse.json({ ok: false, error: "id_pedido não informado." }, { status: 400 });

    // 1. Busca reservas do pedido para reverter qtd_reservada
    const { data: reservas } = await supabase
      .from("reservas_estoque")
      .select("id_estoque_linha, gramas_reservadas")
      .eq("id_pedido", Number(id_pedido));

    if (reservas?.length) {
      // Agrupa por carretel
      const porCarretel = new Map<number, number>();
      for (const r of reservas) {
        porCarretel.set(r.id_estoque_linha, (porCarretel.get(r.id_estoque_linha) || 0) + r.gramas_reservadas);
      }
      // Reverte qtd_reservada
      for (const [id_estoque, gramas] of porCarretel.entries()) {
        const { data: estoqueRow } = await supabase
          .from("estoque_j_ao_cubo")
          .select("qtd_reservada")
          .eq("id_estoque", id_estoque)
          .single();
        const reservadoAtual = Number(estoqueRow?.qtd_reservada || 0);
        const novoValor = Math.max(0, Number((reservadoAtual - gramas).toFixed(3)));
        await supabase
          .from("estoque_j_ao_cubo")
          .update({ qtd_reservada: novoValor })
          .eq("id_estoque", id_estoque);
      }
    }

    // 2. Apaga reservas
    const { error } = await supabase.from("reservas_estoque").delete().eq("id_pedido", Number(id_pedido));
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao liberar reservas." }, { status: 500 });
  }
}
