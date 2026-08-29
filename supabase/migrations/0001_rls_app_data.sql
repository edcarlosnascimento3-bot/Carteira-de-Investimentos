-- 0001_rls_app_data.sql
-- Objetivo: isolar dados por usuário na tabela `app_data` (RLS), mantendo a
-- leitura dos registros legados sob o UUID placeholder para que a
-- auto-migração do app (storage.js -> readSupabase fallback) continue
-- funcionando até cada usuário ter seus próprios registros.
--
-- Executar como admin/service_role no painel do Supabase (SQL Editor).
-- Depois de alguns dias com uso, limpar os registros legados:
--   DELETE FROM app_data WHERE user_id = '00000000-0000-0000-0000-000000000000';

BEGIN;

ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- Base para o upsert (.upsert({ key, value, user_id })) e para acelerar a
-- política de migração legada abaixo.
CREATE UNIQUE INDEX IF NOT EXISTS app_data_user_key_idx ON app_data (user_id, key);

-- SELECIONAR: só os próprios registros OU legados ainda não migrados.
DROP POLICY IF EXISTS app_data_select_own ON app_data;
CREATE POLICY app_data_select_own ON app_data
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      user_id = '00000000-0000-0000-0000-000000000000'
      AND NOT EXISTS (
        SELECT 1 FROM app_data own
        WHERE own.user_id = auth.uid() AND own.key = app_data.key
      )
    )
  );

-- INSERIR/ATUALIZAR/EXCLUIR: apenas a própria linha.
DROP POLICY IF EXISTS app_data_insert_own ON app_data;
CREATE POLICY app_data_insert_own ON app_data
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS app_data_update_own ON app_data;
CREATE POLICY app_data_update_own ON app_data
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS app_data_delete_own ON app_data;
CREATE POLICY app_data_delete_own ON app_data
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Remove políticas antigas genéricas que permitiriam cruzamento de usuários.
DROP POLICY IF EXISTS "Enable all for authenticated users" ON app_data;
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON app_data;
DROP POLICY IF EXISTS app_data_all ON app_data;

COMMIT;