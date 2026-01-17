-- Migration: Contexto de sessão do usuário (fallback robusto para mode/empresa_id)
-- Objetivo:
-- - Persistir mode + empresa_id por user_id sem depender da existência de colunas em users/users_meugestor
-- - Tornar as funções current_* usadas nas policies independentes do schema de users

CREATE TABLE IF NOT EXISTS public.user_session_context (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'pessoal' CHECK (mode IN ('pessoal', 'empresa')),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_session_context_tenant_id ON public.user_session_context(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_session_context_empresa_id ON public.user_session_context(empresa_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_user_session_context_updated_at ON public.user_session_context;
CREATE TRIGGER update_user_session_context_updated_at
  BEFORE UPDATE ON public.user_session_context
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.user_session_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own session context" ON public.user_session_context;
CREATE POLICY "Users can read own session context"
  ON public.user_session_context FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own session context" ON public.user_session_context;
CREATE POLICY "Users can update own session context"
  ON public.user_session_context FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Funções current_* (preferem user_session_context, fallback em users/users_meugestor)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.user_session_context') IS NOT NULL THEN
    RETURN (SELECT usc.tenant_id FROM public.user_session_context usc WHERE usc.user_id = auth.uid());
  END IF;

  IF to_regclass('public.users_meugestor') IS NOT NULL THEN
    RETURN (SELECT u.tenant_id FROM public.users_meugestor u WHERE u.id = auth.uid());
  ELSIF to_regclass('public.users') IS NOT NULL THEN
    RETURN (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid());
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.user_session_context') IS NOT NULL THEN
    RETURN (SELECT usc.empresa_id FROM public.user_session_context usc WHERE usc.user_id = auth.uid());
  END IF;

  IF to_regclass('public.users_meugestor') IS NOT NULL THEN
    RETURN (SELECT u.empresa_id FROM public.users_meugestor u WHERE u.id = auth.uid());
  ELSIF to_regclass('public.users') IS NOT NULL THEN
    RETURN (SELECT u.empresa_id FROM public.users u WHERE u.id = auth.uid());
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_mode()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m TEXT;
BEGIN
  IF to_regclass('public.user_session_context') IS NOT NULL THEN
    SELECT COALESCE(usc.mode, 'pessoal') INTO m
    FROM public.user_session_context usc
    WHERE usc.user_id = auth.uid();
    RETURN COALESCE(m, 'pessoal');
  END IF;

  IF to_regclass('public.users_meugestor') IS NOT NULL THEN
    SELECT COALESCE(u.mode, 'pessoal') INTO m FROM public.users_meugestor u WHERE u.id = auth.uid();
    RETURN COALESCE(m, 'pessoal');
  ELSIF to_regclass('public.users') IS NOT NULL THEN
    SELECT COALESCE(u.mode, 'pessoal') INTO m FROM public.users u WHERE u.id = auth.uid();
    RETURN COALESCE(m, 'pessoal');
  END IF;

  RETURN 'pessoal';
END;
$$;

