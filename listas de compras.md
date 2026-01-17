CONTEXTO DO PROJETO:
Estamos desenvolvendo um assistente conversacional (via texto e áudio, ex: WhatsApp)
para gestão pessoal: agenda, financeiro e agora LISTAS (ex: lista de compras).

O sistema é multi-tenant.
Todas as entidades devem usar `tenant_id` (NÃO usar user_id).

O objetivo é ter um comportamento NATURAL, direto e sem perguntas desnecessárias,
inspirado em Alexa / Google Assistant.

---

OBJETIVO DO MÓDULO:
Criar um módulo de LISTAS (inicialmente “lista de compras”) onde o usuário pode:

- Criar listas
- Adicionar itens
- Remover itens
- Marcar itens como comprados
- Ver itens da lista
- Usar follow-ups curtos sem repetir o nome da lista

Tudo isso via linguagem natural, com execução direta sempre que possível.

---

MODELO DE DADOS (OBRIGATÓRIO):

Criar as tabelas (ou equivalente no ORM):

TABELA: listas
- id
- tenant_id
- nome              // ex: "mercado", "farmácia"
- tipo              // ex: "compras"
- created_at
- updated_at

REGRAS:
- (tenant_id + nome) deve ser único
- Um tenant pode ter várias listas

---

TABELA: lista_itens
- id
- lista_id
- nome              // ex: "leite", "arroz"
- quantidade        // opcional (number | string)
- unidade           // opcional ("kg", "litro", "unidade")
- status            // "pendente" | "comprado"
- created_at
- updated_at

---

NOVO DOMÍNIO SEMÂNTICO:
Adicionar domínio:
- domain: "listas"

---

INTENÇÕES (INTENT) OBRIGATÓRIAS:

1) create_list
Frases exemplo:
- “Cria uma lista de compras chamada mercado”
- “Nova lista mercado”
- “Cria uma lista chamada farmácia”

Resultado esperado:
- Criar a lista no banco usando tenant_id
- Responder curto: “Lista ‘mercado’ criada.”

---

2) add_list_item
Frases exemplo:
- “Adiciona leite na lista do mercado”
- “Coloca arroz no mercado”
- “Adicionar 2 litros de leite no mercado”

Campos:
- list_name
- item_name
- quantidade (opcional)
- unidade (opcional)

REGRAS:
- Se a lista não existir, criar automaticamente (vinculada ao tenant)
- Se o item já existir e estiver pendente, NÃO duplicar
- Resposta curta: “Leite adicionado à lista mercado.”

---

3) remove_list_item
Frases:
- “Remove leite da lista do mercado”
- “Tira arroz do mercado”

Resultado:
- Remover item da lista
- Resposta curta

---

4) mark_item_done
Frases:
- “Marca leite como comprado”
- “Já comprei o arroz”
- “Leite comprado”

Resultado:
- Atualizar status para “comprado”
- Resposta curta

---

5) show_list
Frases:
- “O que tem na lista do mercado?”
- “Minha lista de compras”
- “Lista do mercado”

Resultado:
- Listar itens pendentes primeiro
- Depois itens comprados (opcional)

---

CONTEXTO E FOLLOW-UP (CRÍTICO):

Implementar contexto persistente:

lastActiveList = {
  tenant_id,
  list_name: "mercado"
}

REGRAS:
- Após qualquer ação em uma lista, salvar lastActiveList
- Mensagens curtas como:
  - “Adiciona arroz”
  - “Remove leite”
  - “Marca como comprado”
Devem usar a última lista ativa SEM perguntar novamente.

---

REGRAS DE UX (ESTILO ALEXA):

- NÃO pedir confirmação para ações simples
- NÃO perguntar “posso salvar assim?”
- Executar direto sempre que houver informação suficiente
- Só perguntar se:
  - existir ambiguidade real (ex: duas listas com nomes parecidos dentro do mesmo tenant)
  - faltar informação essencial

---

REGRAS IMPORTANTES:

1) LISTA ≠ GASTO
- Não registrar gasto automaticamente
- Lista é intenção futura

2) TEXTO CURTO = CONTINUAÇÃO
- “arroz”
- “mais leite”
- “remove isso”
Usar contexto ativo

3) ÁUDIO = TEXTO
- Áudio não cria nova intenção
- Áudio apenas alimenta o mesmo fluxo

---

EXEMPLO DE FLUXO PERFEITO (OBRIGATÓRIO):

Usuário: “Cria uma lista de compras chamada mercado”
Bot: “Lista ‘mercado’ criada.”

Usuário: “Adiciona leite”
Bot: “Leite adicionado à lista mercado.”

Usuário: “Adiciona arroz”
Bot: “Arroz adicionado à lista mercado.”

Usuário: “Marca leite como comprado”
Bot: “Leite marcado como comprado.”

Usuário: “O que falta comprar?”
Bot: “Na lista mercado ainda falta: arroz.”

---

ARQUITETURA (IMPORTANTE):

- IA:
  - Apenas identifica intenção e extrai dados
- Sistema:
  - Valida
  - Executa
  - Gerencia contexto
- Banco:
  - Sempre filtrado por tenant_id

---

RESULTADO FINAL ESPERADO:

Um módulo de listas:
- Multi-tenant
- Natural
- Rápido
- Sem enrolação
- Estilo Alexa
- Integrado ao chat existente
- Preparado para evoluir (tarefas, checklists, etc.)