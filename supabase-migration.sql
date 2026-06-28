-- =============================================================
-- MIGRATION: Adicionar user_id + RLS para isolamento de usuarios
-- =============================================================

-- 1. Adicionar coluna user_id
ALTER TABLE app_data ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Legacy rows recebem um placeholder UUID (depois o seed script migra pro user real)
UPDATE app_data SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;

-- 3. Agora user_id pode ser NOT NULL
ALTER TABLE app_data ALTER COLUMN user_id SET NOT NULL;

-- 4. Migrar PK: de (key) para (user_id, key)
ALTER TABLE app_data DROP CONSTRAINT IF EXISTS app_data_pkey;
ALTER TABLE app_data ADD PRIMARY KEY (user_id, key);

-- 5. Adicionar updated_at se nao existir
ALTER TABLE app_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. RLS
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Liberar tudo para todos" ON app_data;
DROP POLICY IF EXISTS "Usuarios veem apenas seus dados" ON app_data;

-- Usuarios autenticados: acesso total apenas aos proprios registros
-- Legacy (placeholder) tambem acessivel para compatibilidade durante migracao
CREATE POLICY "Usuarios veem apenas seus dados" ON app_data
  FOR ALL
  USING (user_id IN ('00000000-0000-0000-0000-000000000000', auth.uid()))
  WITH CHECK (user_id = auth.uid());

-- 7. Valores iniciais para novos usuarios (com placeholder)
INSERT INTO app_data (key, value, user_id) VALUES
  ('transactions', '[]'::jsonb, '00000000-0000-0000-0000-000000000000'),
  ('proventos', '[]'::jsonb, '00000000-0000-0000-0000-000000000000'),
  ('user', '{"userName": "Investidor"}'::jsonb, '00000000-0000-0000-0000-000000000000'),
  ('ativos', '[]'::jsonb, '00000000-0000-0000-0000-000000000000'),
  ('corretoras', '[]'::jsonb, '00000000-0000-0000-0000-000000000000'),
  ('rf_manual', '[]'::jsonb, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (user_id, key) DO NOTHING;
