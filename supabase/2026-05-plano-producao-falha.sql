-- ============================================================
-- MIGRATION: Coluna "falha" no plano_producao
-- Execute no Supabase > SQL Editor
-- ============================================================

-- A tabela falhas_producao JA EXISTE com a estrutura fornecida.
-- Esta migration apenas garante que status_producao aceita o
-- novo valor 'falha'. Se a coluna for text (sem CHECK), nada
-- e necessario. Se houver um CHECK constraint, execute abaixo:

-- (Execute somente se houver erro de constraint ao salvar 'falha')
-- ALTER TABLE plano_producao
--   DROP CONSTRAINT IF EXISTS plano_producao_status_producao_check;

-- ALTER TABLE plano_producao
--   ADD CONSTRAINT plano_producao_status_producao_check
--   CHECK (status_producao IN ('pedidos','fila','producao','finalizado','falha'));

-- ── Confirmacao ──────────────────────────────────────────────
-- Teste rapido: tente inserir um registro com status 'falha'
-- INSERT INTO plano_producao (id_pedido, status_producao)
-- VALUES (999, 'falha');
-- Se funcionar, nenhuma alteracao e necessaria.
-- DELETE FROM plano_producao WHERE id_pedido = 999;

-- ── Indice sugerido para consultas de falha ──────────────────
CREATE INDEX IF NOT EXISTS idx_plano_producao_status
  ON plano_producao (status_producao);

CREATE INDEX IF NOT EXISTS idx_falhas_producao_id_3mf
  ON falhas_producao (id_3mf);

-- ── FIM ──────────────────────────────────────────────────────
