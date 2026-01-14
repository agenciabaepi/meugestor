# 🤝 Guia de Contribuição

## 📝 Estrutura do Projeto

### Organização de Código

```
lib/
├── ai/              # Camada de IA (OpenAI, Whisper, Vision)
├── db/              # Camada de dados (Supabase)
├── modules/         # Módulos externos (WhatsApp, Tenant)
├── services/        # Regras de negócio
├── jobs/            # Jobs agendados
└── utils/           # Utilitários gerais
```

### Princípios

1. **Separação de Responsabilidades**
   - `services/`: Regra de negócio pura
   - `ai/`: Integração com IA
   - `db/`: Acesso ao banco
   - `modules/`: Integrações externas

2. **Nunca Misturar**
   - Prompts não devem conter lógica de negócio
   - Validações devem estar em `services/`
   - Queries devem estar em `db/queries.ts`

3. **Isolamento por Tenant**
   - Todas as queries filtram por `tenant_id`
   - RLS garante isolamento automático
   - Nunca acessar dados de outro tenant

## 🔧 Desenvolvimento

### Adicionar Nova Funcionalidade

1. **Criar serviço** em `lib/services/`
2. **Adicionar queries** em `lib/db/queries.ts`
3. **Integrar com IA** se necessário
4. **Criar endpoint** em `app/api/`
5. **Adicionar ao dashboard** se aplicável

### Adicionar Nova Tabela

1. **Criar migration** em `supabase/migrations/`
2. **Adicionar tipos** em `lib/db/types.ts`
3. **Criar queries** em `lib/db/queries.ts`
4. **Configurar RLS** na migration

## 📚 Padrões de Código

### TypeScript
- Sempre usar tipos explícitos
- Evitar `any`
- Usar interfaces para objetos complexos

### Nomenclatura
- Funções: `camelCase`
- Componentes: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- Arquivos: `kebab-case.ts`

### Tratamento de Erros
- Sempre usar try/catch
- Logar erros com `console.error`
- Retornar mensagens amigáveis ao usuário

## 🧪 Testes

Antes de fazer commit:
1. Testar localmente
2. Verificar logs
3. Testar fluxo completo
4. Verificar se não quebrou nada

## 📝 Commits

Use mensagens descritivas:
```
feat: adiciona funcionalidade X
fix: corrige bug Y
docs: atualiza documentação
refactor: reorganiza código
```

## 🚀 Deploy

Antes de fazer deploy:
1. Testar todas as funcionalidades
2. Verificar variáveis de ambiente
3. Aplicar migrations no Supabase
4. Testar webhook do WhatsApp
