# 🔄 Atualizar Modelo OpenAI na Vercel

## ✅ Passo a Passo

### 1. Acesse o Painel da Vercel

1. Vá para: https://vercel.com/rhema-gestaos-projects/meugestor
2. Clique em **Settings** (Configurações)
3. Clique em **Environment Variables** (Variáveis de Ambiente)

### 2. Atualize a Variável OPENAI_MODEL

1. Procure pela variável `OPENAI_MODEL`
2. Clique em **Edit** (Editar)
3. Altere o valor de:
   - ❌ `gpt-4o-2024-08-06` ou `gpt-4o`
   - ✅ Para: `gpt-5.2`
4. Certifique-se de que está marcado para:
   - ✅ **Production**
   - ✅ **Preview**
5. Clique em **Save** (Salvar)

### 3. Faça um Novo Deploy

Após atualizar a variável, você precisa fazer um novo deploy:

**Opção 1: Deploy Automático**
- Faça um commit e push para o GitHub
- A Vercel fará deploy automaticamente

**Opção 2: Redeploy Manual**
1. Vá em **Deployments**
2. Clique nos **3 pontos** do último deployment
3. Selecione **Redeploy**
4. Confirme o redeploy

### 4. Verifique se Funcionou

Após o deploy, teste enviando uma mensagem para o bot do WhatsApp. O sistema deve estar usando o GPT-5.2.

---

## 📋 Resumo da Mudança

| Antes | Depois |
|-------|--------|
| `gpt-4o-2024-08-06` | `gpt-5.2` |
| ou `gpt-4o` | |

---

## ⚠️ Importante sobre Custos

O GPT-5.2 é **muito mais caro** que o GPT-4o:

- **GPT-5.2**: $1.75/1K input, $14/1K output
- **GPT-4o**: $0.0025/1K input, $0.01/1K output

Se quiser economizar, você pode:
1. Voltar para `gpt-4o` na variável de ambiente
2. Ou usar `gpt-5.2-chat-latest` (se disponível e mais barato)

---

## 🔗 Link Direto

Acesse diretamente as variáveis de ambiente:
https://vercel.com/rhema-gestaos-projects/meugestor/settings/environment-variables
