-- Migration: Corrigir handle_new_user para usar tenant existente
-- Description: Modifica o trigger para verificar se já existe um tenant com o número do WhatsApp antes de criar um novo

-- Atualiza a função handle_new_user para usar tenant existente se o número já existir
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  existing_tenant_id UUID;
  whatsapp_num TEXT;
BEGIN
  -- Valida se whatsapp_number foi fornecido
  whatsapp_num := COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', '');
  
  IF whatsapp_num = '' THEN
    RAISE EXCEPTION 'whatsapp_number é obrigatório';
  END IF;
  
  -- Verifica se já existe um tenant com esse número do WhatsApp
  SELECT id INTO existing_tenant_id
  FROM public.tenants
  WHERE whatsapp_number = whatsapp_num
  LIMIT 1;
  
  -- Se encontrou um tenant existente, usa ele. Caso contrário, cria um novo
  IF existing_tenant_id IS NOT NULL THEN
    new_tenant_id := existing_tenant_id;
  ELSE
    -- Cria um novo tenant apenas se não existir
    INSERT INTO public.tenants (name, whatsapp_number)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      whatsapp_num
    )
    RETURNING id INTO new_tenant_id;
  END IF;
  
  -- Cria registro na tabela users
  INSERT INTO public.users (id, tenant_id, email, whatsapp_number, role, name)
  VALUES (
    NEW.id,
    new_tenant_id,
    NEW.email,
    whatsapp_num,
    'admin',
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
