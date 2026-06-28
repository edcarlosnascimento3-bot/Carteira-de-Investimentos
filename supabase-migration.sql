-- =============================================================
-- 1. CRIAR A TABELA ÚNICA (key-value)
-- =============================================================
CREATE TABLE IF NOT EXISTS app_data (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 2. INSERIR REGISTROS INICIAIS
-- =============================================================
INSERT INTO app_data (key, value) VALUES
  ('transactions', '[]'::jsonb),
  ('proventos', '[]'::jsonb),
  ('user', '{"userName": "Investidor"}'::jsonb),
  ('ativos', '[]'::jsonb),
  ('corretoras', '[]'::jsonb),
  ('rf_manual', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =============================================================
-- 3. LIBERAR ACESSO VIA API (anon key)
-- =============================================================
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Liberar tudo para todos" ON app_data
  FOR ALL
  USING (true)
  WITH CHECK (true);
