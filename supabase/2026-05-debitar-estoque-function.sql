-- ============================================================
-- MIGRATION: Função debitar_estoque
-- Execute no Supabase > SQL Editor
-- ============================================================

-- Função atômica que subtrai gramas do estoque de um filamento.
-- Se o saldo ficar negativo, vai a zero (não bloqueia a operação).

CREATE OR REPLACE FUNCTION debitar_estoque(
  p_id_filamento integer,
  p_gramas       numeric
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE estoque_j_ao_cubo
  SET qtd_estoque_gramas = GREATEST(0, COALESCE(qtd_estoque_gramas, 0) - p_gramas)
  WHERE id_filamento = p_id_filamento;

  -- Se nenhuma linha foi afetada, o filamento não tem registro de estoque — ignora silenciosamente
END;
$$;

-- ── FIM ──────────────────────────────────────────────────────
