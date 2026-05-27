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

    // Fix #3 — Sequência segura para evitar perda de dados:
    // 1. Lê reservas ANTIGAS antes de apagar (para poder reverter qtd_reservada).
    const { data: reservasAntigas } = await supabase
      .from("reservas_estoque")
      .select("id_estoque_linha, gramas_reservadas")
      .eq("id_pedido", id_pedido);

    // 2. Zera qtd_reservada dos carretéis das reservas antigas.
    if (reservasAntigas?.length) {
      const porCarretelAntigas = new Map<number, number>();
      for (const r of reservasAntigas) {
        porCarretelAntigas.set(
          r.id_estoque_linha,
          (porCarretelAntigas.get(r.id_estoque_linha) || 0) + r.gramas_reservadas,
        );
      }
      for (const [id_estoque, gramas] of porCarretelAntigas.entries()) {
        const { data: row } = await supabase
          .from("estoque_j_ao_cubo")
          .select("qtd_reservada")
          .eq("id_estoque", id_estoque)
          .single();
        const atual = Number(row?.qtd_reservada || 0);
        await supabase
          .from("estoque_j_ao_cubo")
          .update({ qtd_reservada: Math.max(0, Number((atual - gramas).toFixed(3))) })
          .eq("id_estoque", id_estoque);
      }
    }

    // 3. Apaga registros de reserva antigos.
    await supabase.from("reservas_estoque").delete().eq("id_pedido", id_pedido);

    // 4. Insere novas reservas.
    const { error: errInsert } = await supabase.from("reservas_estoque").insert(reservas);
    if (errInsert) return NextResponse.json({ ok: false, error: errInsert.message }, { status: 500 });

    // 5. Incrementa qtd_reservada apenas com as novas reservas.
    const porCarretelNovo = new Map<number, number>();
    for (const r of reservas) {
      porCarretelNovo.set(r.id_estoque_linha, (porCarretelNovo.get(r.id_estoque_linha) || 0) + r.gramas_reservadas);
    }
    for (const [id_estoque, gramas] of porCarretelNovo.entries()) {
      const { data: row } = await supabase
        .from("estoque_j_ao_cubo")
        .select("qtd_reservada")
        .eq("id_estoque", id_estoque)
        .single();
      const atual = Number(row?.qtd_reservada || 0);
      await supabase
        .from("estoque_j_ao_cubo")
        .update({ qtd_reservada: Number((atual + gramas).toFixed(3)) })
        .eq("id_estoque", id_estoque);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Falha ao processar reservas." },
      { status: 500 },
    );
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
      const porCarretel = new Map<number, number>();
      for (const r of reservas) {
        porCarretel.set(r.id_estoque_linha, (porCarretel.get(r.id_estoque_linha) || 0) + r.gramas_reservadas);
      }
      for (const [id_estoque, gramas] of porCarretel.entries()) {
        const { data: row } = await supabase
          .from("estoque_j_ao_cubo")
          .select("qtd_reservada")
          .eq("id_estoque", id_estoque)
          .single();
        const atual = Number(row?.qtd_reservada || 0);
        await supabase
          .from("estoque_j_ao_cubo")
          .update({ qtd_reservada: Math.max(0, Number((atual - gramas).toFixed(3))) })
          .eq("id_estoque", id_estoque);
      }
    }

    // 2. Apaga reservas
    const { error } = await supabase.from("reservas_estoque").delete().eq("id_pedido", Number(id_pedido));
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Falha ao liberar reservas." },
      { status: 500 },
    );
  }
}
