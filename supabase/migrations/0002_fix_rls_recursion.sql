-- 0002_fix_rls_recursion.sql
-- Correção: RLS com "infinite recursion detected in policy for relation app_data".
--
-- Causa: a política de SELECT consultava a PRÓPRIA tabela app_data dentro de
-- NOT EXISTS (subconsulta sujeita ao RLS) → recursão infinita (erro 42P17).
-- Consequência: nenhum usuário autenticado conseguia ler/gravar dados → app vazio.
--
-- Correção: isolar a consulta "usuário já possui dados próprios?" em uma função
-- SECURITY DEFINER (executa com privilégios do owner, ignorando RLS) e usar essa
-- função na política.
--
-- Executar como admin/service_role no painel do Supabase (SQL Editor).

CREATE OR REPLACE FUNCTION public._app_data_has_own(user_uuid uuid, data_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_data
    WHERE user_id = user_uuid AND key = data_key
  );
$$;

REVOKE ALL ON FUNCTION public._app_data_has_own(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._app_data_has_own(uuid, text) TO authenticated;

-- Remove TODAS as políticas já existentes (por nome conhecido) antes de recriar,
-- para o script ser idempotente (DROP IF EXISTS + CREATE).
DROP POLICY IF EXISTS app_data_select_own ON app_data;
DROP POLICY IF EXISTS app_data_insert_own ON app_data;
DROP POLICY IF EXISTS app_data_update_own ON app_data;
DROP POLICY IF EXISTS app_data_delete_own ON app_data;
DROP POLICY IF EXISTS "Usuarios veem apenas seus dados" ON app_data;
DROP POLICY IF EXISTS app_data_all ON app_data;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON app_data;
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON app_data;

-- Recria as políticas de forma segura (SEM recursão)

-- SELECT: próprio registro OU legado (placeholder) ainda não migrado p/ este usuário.
CREATE POLICY app_data_select_own ON app_data
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      user_id = '00000000-0000-0000-0000-000000000000'
      AND NOT public._app_data_has_own(auth.uid(), app_data.key)
    )
  );

-- INSERT / UPDATE / DELETE: apenas a própria linha.
CREATE POLICY app_data_insert_own ON app_data
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY app_data_update_own ON app_data
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY app_data_delete_own ON app_data
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());