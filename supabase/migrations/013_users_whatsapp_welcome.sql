-- Migration: WhatsApp welcome message idempotency
-- Description: Guarda marcação de boas-vindas enviada para o número vinculado, para evitar duplicidade

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS whatsapp_welcome_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_welcome_sent_number TEXT;

CREATE INDEX IF NOT EXISTS idx_users_whatsapp_welcome_sent_at
  ON public.users (whatsapp_welcome_sent_at);

COMMENT ON COLUMN public.users.whatsapp_welcome_sent_at IS 'Quando a mensagem de boas-vindas foi enviada via WhatsApp';
COMMENT ON COLUMN public.users.whatsapp_welcome_sent_number IS 'Número (normalizado) para o qual a mensagem de boas-vindas foi enviada';

