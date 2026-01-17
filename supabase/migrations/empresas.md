OBJETIVO:
Implementar no MODO EMPRESA um sistema completo de:
- categorias e subcategorias empresariais
- gastos fixos e variáveis
- compra de produtos
- cadastro e uso de fornecedores
- relatórios por fornecedor e categoria

SEM alterar o funcionamento do modo pessoal.

---

## 1️⃣ CONCEITO-CHAVE

No modo EMPRESA, o financeiro precisa ser:
- estruturado
- categorizado
- auditável
- preparado para relatórios

Diferente do modo pessoal, aqui teremos:
- categorias fixas padrão
- produtos
- fornecedores
- custos recorrentes (fixos)
- custos variáveis (compras, serviços, materiais)

---

## 2️⃣ CATEGORIAS EMPRESARIAIS (PADRÃO DO SISTEMA)

Criar uma tabela:
### categorias_empresa

Campos:
- id
- tenant_id
- empresa_id
- nome
- tipo: "fixo" | "variavel"
- is_default (boolean)
- created_at

⚠️ Categorias default NÃO podem ser apagadas.
⚠️ Podem ser editadas apenas no nome (opcional).

---

### 🔹 CATEGORIAS FIXAS (DEFAULT)

Criar automaticamente para toda empresa:

- Aluguel
- Água
- Energia elétrica
- Internet / Telefonia
- Funcionários
- Pró-labore
- Contabilidade
- Impostos e taxas
- Sistemas / Software
- Marketing
- Manutenção
- Limpeza
- Seguro
- Transporte / Logística

tipo = "fixo"
is_default = true

---

### 🔹 CATEGORIAS VARIÁVEIS (DEFAULT)

- Materiais
- Produtos
- Fornecedores
- Compras operacionais
- Serviços terceirizados
- Equipamentos
- Ferramentas
- Estoque

tipo = "variavel"
is_default = true

---

### 🔹 CATEGORIAS CUSTOMIZADAS

Usuário pode criar novas categorias:
- tipo definido pelo usuário
- is_default = false
- sempre vinculada a empresa_id

---

## 3️⃣ SUBCATEGORIAS (EMPRESA)

Criar tabela:
### subcategorias_empresa

Campos:
- id
- tenant_id
- empresa_id
- categoria_id
- nome
- created_at

Exemplos:
Categoria: Materiais
- tinta
- rolo
- pincel
- massa corrida

Categoria: Serviços terceirizados
- eletricista
- encanador
- frete

---

## 4️⃣ FORNECEDORES (NOVO MÓDULO)

Criar tabela:
### fornecedores

Campos:
- id
- tenant_id
- empresa_id
- nome
- telefone (opcional)
- email (opcional)
- observacao (opcional)
- created_at

---

### REGRAS IMPORTANTES DE FORNECEDOR:

- Fornecedor pode ser criado automaticamente via IA
- Ex: “comprei tinta no fornecedor X”
- Se fornecedor não existir → criar
- Se existir → reutilizar

---

## 5️⃣ GASTOS COM PRODUTOS (EMPRESA)

Criar tabela:
### gastos_empresa

Campos obrigatórios:
- id
- tenant_id
- empresa_id
- categoria_id
- subcategoria_id (opcional)
- fornecedor_id (opcional)
- descricao
- quantidade (opcional)
- valor_unitario (opcional)
- valor_total
- data
- created_at

---

### EXEMPLOS QUE O SISTEMA DEVE ENTENDER:

🗣️ "Comprei 3 latas de tinta por 30 reais no fornecedor Casa das Tintas"

Resultado:
- categoria: Materiais
- subcategoria: tinta
- fornecedor: Casa das Tintas
- quantidade: 3
- valor_total: 30

🗣️ "Gastei 120 reais com eletricista no fornecedor João"

Resultado:
- categoria: Serviços terceirizados
- fornecedor: João
- valor_total: 120

---

## 6️⃣ RELATÓRIOS (BASE PARA FUTURO DASHBOARD)

O sistema deve permitir consultas como:

- quanto gastei por categoria
- quanto gastei por subcategoria
- quanto gastei por fornecedor
- ranking de fornecedores
- gastos fixos x variáveis

Essas consultas devem usar:
- gastos_empresa
- JOIN com fornecedores
- JOIN com categorias

---

## 7️⃣ IA — COMPORTAMENTO OBRIGATÓRIO

### REGRA DE OURO:
Se o usuário falar algo que claramente é um gasto empresarial:
→ REGISTRAR DIRETO
→ SEM perguntas
→ SEM confirmação

Perguntar SOMENTE se faltar algo crítico:
- valor
- categoria impossível de inferir

---

### EXEMPLOS SEM PERGUNTAS:

🗣️ "Paguei 300 reais de aluguel"
🗣️ "Comprei tinta no fornecedor X"
🗣️ "Gastei 80 reais em ferramentas"

---

## 8️⃣ COMPATIBILIDADE

- Nada disso afeta o modo pessoal
- Tabelas são separadas
- IA deve respeitar o contexto: mode === empresa

---

RESULTADO FINAL ESPERADO:
- Financeiro empresarial completo
- Categorias profissionais
- Controle por fornecedor
- Base sólida para relatórios e dashboard