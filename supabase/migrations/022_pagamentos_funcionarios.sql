-- Migration: Pagamentos de Funcionários
-- Descrição: Cria tabela para rastrear pagamentos de salários de funcionários
-- Aditiva: não altera funcionalidades existentes

-- ============================================
-- PAGAMENTOS_FUNCIONARIOS
-- ============================================

CREATE TABLE IF NOT EXISTS pagamentos_funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pago' CHECK (status IN ('pago', 'pendente')),
  referencia TEXT, -- Ex: "01/2026" para identificar mês/ano
  financeiro_id UUID REFERENCES financeiro_empresa(id) ON DELETE SET NULL, -- Vincula ao gasto registrado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_funcionarios_tenant_id ON pagamentos_funcionarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_funcionarios_empresa_id ON pagamentos_funcionarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_funcionarios_funcionario_id ON pagamentos_funcionarios(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_funcionarios_status ON pagamentos_funcionarios(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_funcionarios_data_pagamento ON pagamentos_funcionarios(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_funcionarios_referencia ON pagamentos_funcionarios(referencia);

-- Índice composto para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_pagamentos_funcionarios_empresa_funcionario_data 
  ON pagamentos_funcionarios(empresa_id, funcionario_id, data_pagamento);

-- ============================================
-- RLS (Row Level Security) para pagamentos_funcionarios
-- ============================================

ALTER TABLE pagamentos_funcionarios ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só veem pagamentos da sua empresa (modo empresa)
CREATE POLICY pagamentos_funcionarios_tenant_empresa_isolation
  ON pagamentos_funcionarios
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', TRUE)::UUID
    AND empresa_id = current_setting('app.empresa_id', TRUE)::UUID
  );

-- ============================================
-- TRIGGER: Atualiza updated_at automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION update_pagamentos_funcionarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pagamentos_funcionarios_updated_at
  BEFORE UPDATE ON pagamentos_funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION update_pagamentos_funcionarios_updated_at();

-- ============================================
-- COMENTÁRIOS (DOCUMENTAÇÃO)
-- ============================================

COMMENT ON TABLE pagamentos_funcionarios IS 'Registra pagamentos de salários de funcionários. Vinculado a funcionarios e financeiro_empresa.';
COMMENT ON COLUMN pagamentos_funcionarios.valor IS 'Valor do pagamento (deve ser > 0)';
COMMENT ON COLUMN pagamentos_funcionarios.data_pagamento IS 'Data em que o pagamento foi realizado';
COMMENT ON COLUMN pagamentos_funcionarios.status IS 'Status: pago (já foi pago) ou pendente (a pagar)';
COMMENT ON COLUMN pagamentos_funcionarios.referencia IS 'Referência do período (ex: "01/2026" para janeiro/2026)';
COMMENT ON COLUMN pagamentos_funcionarios.financeiro_id IS 'ID do registro em financeiro_empresa vinculado a este pagamento';
