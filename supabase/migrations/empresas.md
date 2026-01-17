OBJETIVO GERAL:
Adicionar ao sistema a opção de USO EMPRESARIAL, sem remover ou quebrar
nenhuma funcionalidade existente de USO PESSOAL.

O sistema deve suportar:
- organização pessoal (como já funciona hoje)
- organização de empresas (novo modo)

Ambos devem coexistir.

---

CONCEITO-CHAVE (REGRA DE OURO):
O sistema terá DOIS MODOS DE OPERAÇÃO:

1) MODO PESSOAL
2) MODO EMPRESA

O modo é definido no CADASTRO e controla:
- quais tabelas usar
- quais categorias usar
- quais opções aparecem na interface

---

### 1️⃣ FLUXO DE CADASTRO (ALTERAÇÃO)

No cadastro inicial, o usuário deve escolher:

🔘 Uso pessoal  
🔘 Uso empresarial  

#### Caso escolha USO PESSOAL:
- Comportamento atual permanece IGUAL
- Usa tabelas pessoais já existentes
- Usa categorias pessoais
- Nenhuma mudança no fluxo atual

#### Caso escolha USO EMPRESARIAL:
- Usuário deve cadastrar uma EMPRESA
- Dados mínimos da empresa:
  - id
  - tenant_id
  - nome_fantasia
  - razao_social (opcional)
  - cnpj (opcional)
  - created_at

- O usuário passa a operar no CONTEXTO DA EMPRESA
- Ao logar, ele NÃO vê mais opções pessoais
- Interface muda para modo empresa

---

### 2️⃣ MODELAGEM DE BANCO DE DADOS

⚠️ REGRA CRÍTICA:
NÃO reutilizar tabelas pessoais para empresa.
Criar tabelas PARALELAS.

---

#### Tabelas EXISTENTES (PESSOAL — NÃO MEXER):
- gastos
- receitas
- compromissos
- listas
- lista_itens

Essas continuam funcionando para uso pessoal.

---

#### NOVAS TABELAS (EMPRESA):

Criar versões empresariais com sufixo `_empresa`:

- empresas
- gastos_empresa
- receitas_empresa
- compromissos_empresa
- listas_empresa
- lista_itens_empresa

Todas DEVEM conter:
- id
- tenant_id
- empresa_id
- dados específicos
- created_at

---

### 3️⃣ CONTEXTO DE EXECUÇÃO (LÓGICA DO SISTEMA)

Criar um CONTEXTO GLOBAL de sessão com:
- tenant_id
- mode: "pessoal" | "empresa"
- empresa_id (apenas se mode === empresa)

Todas as operações devem respeitar esse contexto.

Exemplo:
- Se mode === "pessoal" → usar tabelas pessoais
- Se mode === "empresa" → usar tabelas *_empresa

⚠️ PROIBIDO misturar dados.

---

### 4️⃣ FINANCEIRO — DIFERENÇA DE CATEGORIAS

#### Uso pessoal:
Manter categorias atuais (alimentação, mercado, lazer etc).

#### Uso empresarial:
Criar categorias específicas, por exemplo:
- Receita
  - vendas
  - serviços
  - contratos
- Despesas
  - fornecedores
  - impostos
  - folha de pagamento
  - aluguel
  - marketing
  - sistemas
  - logística

O sistema deve carregar as categorias de acordo com o mode.

---

### 5️⃣ LISTAS (EMPRESA)

Listas empresariais funcionam IGUAL às pessoais, mas em tabelas separadas:
- listas_empresa
- lista_itens_empresa

Exemplos:
- lista de compras do escritório
- lista de tarefas internas
- lista de materiais

Mesmas regras de normalização semântica já implementadas.

---

### 6️⃣ COMPROMISSOS (EMPRESA)

Compromissos empresariais:
- reuniões
- prazos
- entregas
- calls

Usar:
- compromissos_empresa

Mesmo comportamento:
- criar
- atualizar
- cancelar
- consultar

---

### 7️⃣ INTERFACE / UX

Após login:

Se mode === pessoal:
- mostrar dashboard pessoal (como hoje)

Se mode === empresa:
- mostrar dashboard empresarial
- esconder opções pessoais
- mostrar nome da empresa no topo
- ações sempre vinculadas à empresa

---

### 8️⃣ MIGRAÇÃO E COMPATIBILIDADE

⚠️ MUITO IMPORTANTE:
- NÃO alterar estrutura atual das tabelas pessoais
- NÃO migrar dados existentes
- NÃO quebrar fluxos atuais

Tudo novo deve ser ADITIVO.

---

### 9️⃣ TESTES OBRIGATÓRIOS

- Usuário pessoal continua funcionando normalmente
- Usuário empresarial:
  - cria empresa
  - registra gasto empresarial
  - cria lista empresarial
  - não vê dados pessoais
- Mesmo tenant pode ter:
  - dados pessoais
  - dados empresariais
  (em contextos separados)

---

RESULTADO FINAL ESPERADO:
- Sistema híbrido (pessoal + empresa)
- Arquitetura limpa
- Zero impacto no que já funciona
- Base sólida para escalar (multi-empresa no futuro)