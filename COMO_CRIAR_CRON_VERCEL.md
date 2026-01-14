# 📍 Onde Criar o Cron na Vercel - Passo a Passo

## 🎯 Localização Exata

O cron é criado no **Dashboard da Vercel**, não no código. O código já está pronto, você só precisa ativá-lo no dashboard.

## ✅ Passo a Passo Detalhado

### 1. Acesse o Dashboard da Vercel

1. Abra seu navegador
2. Acesse: https://vercel.com/dashboard
3. Faça login (se necessário)

### 2. Selecione seu Projeto

1. Na lista de projetos, encontre e clique no projeto **"Meu Gestor"** (ou o nome do seu projeto)
2. Isso abrirá a página do projeto

### 3. Vá para Settings (Configurações)

1. No topo da página do projeto, você verá várias abas:
   - Overview
   - Deployments
   - **Settings** ← Clique aqui
   - Analytics
   - etc.

2. Clique na aba **"Settings"**

### 4. Encontre a Seção "Cron Jobs"

1. No menu lateral esquerdo dentro de Settings, você verá:
   - General
   - Build and Deployment
   - **Functions** ← Expanda esta seção
   - Project Members
   - etc.

2. Dentro de **"Functions"**, você verá:
   - Caches
   - **Cron Jobs** ← Clique aqui
   - Microfrontends

3. Clique em **"Cron Jobs"**

### 5. Verificar se Já Existe

1. Na página de Cron Jobs, você verá:
   - Uma lista de crons existentes (se houver)
   - Ou uma mensagem dizendo que não há crons configurados

2. **Se já aparecer um cron** com:
   - Path: `/api/cron/lembretes`
   - Schedule: `*/5 * * * *`
   - Status: Ativo
   
   **Então está tudo certo!** Não precisa fazer nada mais.

### 6. Se NÃO Aparecer, Criar Manualmente

1. Procure por um botão que diz:
   - **"Add Cron Job"** ou
   - **"Create Cron Job"** ou
   - **"New Cron Job"** ou
   - Um botão **"+"** ou **"Add"**

2. Clique nesse botão

3. Um formulário aparecerá. Preencha:

   **Path:**
   ```
   /api/cron/lembretes
   ```

   **Schedule:**
   ```
   */5 * * * *
   ```
   (Isso significa: a cada 5 minutos)

   **Method (Opcional):**
   - Deixe vazio, ou
   - Selecione **POST**

4. Clique em **"Save"** ou **"Create"**

### 7. Verificar se Foi Criado

1. Após salvar, você deve ver o cron na lista com:
   - ✅ Path: `/api/cron/lembretes`
   - ✅ Schedule: `*/5 * * * *`
   - ✅ Status: **Ativo** ou **Active**

## 📸 Onde Está Visualmente

```
Vercel Dashboard
└── Seu Projeto (Meu Gestor)
    └── Settings (aba no topo)
        └── Functions (menu lateral)
            └── Cron Jobs ← AQUI!
```

## 🔍 Se Não Encontrar a Opção

Se você não encontrar a opção "Cron Jobs" em Settings > Functions:

1. **Verifique o plano**: Crons estão disponíveis em todos os planos, mas podem ter limitações no Hobby (gratuito)
2. **Verifique se fez deploy**: O cron só aparece após pelo menos um deploy
3. **Tente atualizar a página**: Às vezes a interface precisa ser atualizada
4. **Verifique a URL**: Certifique-se de estar em: `https://vercel.com/[seu-usuario]/[seu-projeto]/settings/cron-jobs`

## ⚠️ Importante

- O cron **não aparece automaticamente** após o deploy
- Você precisa **criar manualmente** no dashboard (ou verificar se já foi criado)
- O `vercel.json` apenas **define a configuração**, mas o cron precisa ser **ativado no dashboard**

## ✅ Após Criar

1. O cron começará a rodar automaticamente
2. Você pode verificar os logs em **Deployments > [último deploy] > Logs**
3. Procure por: `=== CRON LEMBRETES INICIADO ===`

## 🆘 Ainda Não Funciona?

Se mesmo após criar o cron ele não executar:

1. Verifique os logs para erros
2. Teste manualmente: `https://seu-dominio.vercel.app/api/cron/lembretes`
3. Verifique se todas as variáveis de ambiente estão configuradas
4. Verifique se o deploy foi bem-sucedido
