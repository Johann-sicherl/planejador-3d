import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

const TABLE  = "falhas_producao";
const FIELDS = ["id_execucao","id_3mf","tempo_impressao_min_perdido","quant_mat_perdido"];
const NUMERIC = ["id_execucao","id_3mf","tempo_impressao_min_perdido","quant_mat_perdido"];

function sanitize(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = body[field];
    if (value === "" || value === undefined || value === null) {
      payload[field] = null;
    } else if (NUMERIC.includes(field)) {
      const parsed = Number(value);
      payload[field] = Number.isNaN(parsed) ? null : parsed;
    } else {
      payload[field] = value;
    }
  }
  return payload;
}

export async function GET() {
  const { data, error } = await supabase.from(TABLE).select("*");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = sanitize(body);
    const { data, error } = await supabase.from(TABLE).insert([payload]).select();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao processar." }, { status: 500 });
  }
}
