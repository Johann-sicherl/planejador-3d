-- ============================================================
-- MIGRATION: Filamentos + Estoque + Pesos de Carreteis
-- Execute no Supabase > SQL Editor
-- ============================================================


-- ── 1. NOVOS CAMPOS EM cadastro_filamentos ─────────────────
-- textura_filamento: Liso, Silk, Matte, etc.
-- tipo_carretel: 1kg, 2kg, 500g, etc.
-- (cor_filamento e id_fabricante_filamento já existem — ignorados)

ALTER TABLE cadastro_filamentos
  ADD COLUMN IF NOT EXISTS textura_filamento text,
  ADD COLUMN IF NOT EXISTS tipo_carretel text;


-- ── 2. NOVA TABELA: cadastro_pesos_carreteis ───────────────
-- Armazena a tara (peso vazio) de cada marca de carretel

CREATE TABLE IF NOT EXISTS cadastro_pesos_carreteis (
  id_carretel   serial PRIMARY KEY,
  marca_carretel text NOT NULL,
  peso_carretel_g numeric NOT NULL
);

-- Inserts iniciais com os pesos fornecidos
INSERT INTO cadastro_pesos_carreteis (marca_carretel, peso_carretel_g)
VALUES
  ('3D LAB',  255),
  ('ENDER',   191),
  ('3D FILA', 212)
ON CONFLICT DO NOTHING;


-- ── 3. NOVOS CAMPOS EM estoque_j_ao_cubo ──────────────────
-- localizacao: onde o carretel está fisicamente
-- peso_com_carretel_g: peso bruto lido na balança
-- id_carretel: FK para cadastro_pesos_carreteis (tara)
-- qtd_estoque_gramas continua sendo o peso LÍQUIDO do filamento
--   e será calculado pela aplicação: peso_com_carretel_g - tara

ALTER TABLE estoque_j_ao_cubo
  ADD COLUMN IF NOT EXISTS localizacao text,
  ADD COLUMN IF NOT EXISTS peso_com_carretel_g numeric,
  ADD COLUMN IF NOT EXISTS id_carretel integer REFERENCES cadastro_pesos_carreteis(id_carretel);


-- ── FIM ────────────────────────────────────────────────────
