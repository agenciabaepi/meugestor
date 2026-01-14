-- Migration: Criar bucket de storage para comprovantes
-- Description: Configura o bucket 'receipts' no Supabase Storage

-- Cria o bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,
  20971520, -- 20MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Cria política para permitir uploads autenticados
CREATE POLICY "Users can upload receipts for their tenant"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Cria política para permitir leitura pública (ou autenticada)
CREATE POLICY "Users can view receipts from their tenant"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
