# ⚙️ Configurar GitHub Actions para Lembretes

## ✅ O Que Foi Feito

O arquivo `.github/workflows/lembretes.yml` já foi criado e configurado para executar a cada 5 minutos.

## 🔧 Passo 1: Ajustar a URL

1. Abra o arquivo `.github/workflows/lembretes.yml`
2. Encontre a linha:
   ```yaml
   URL="https://meugestor.vercel.app/api/cron/lembretes"
   ```
3. Substitua `meugestor.vercel.app` pelo seu domínio real da Vercel
4. Salve e faça commit

**Como descobrir seu domínio:**
- Vercel Dashboard → Seu Projeto → **Settings** → **Domains**
- Ou veja a URL no último deploy

## 🔐 Passo 2: Configurar CRON_SECRET (Opcional mas Recomendado)

Se você configurou `CRON_SECRET` na Vercel, adicione também no GitHub:

1. GitHub → Seu Repositório → **Settings**
2. Vá em **Secrets and variables** → **Actions**
3. Clique em **"New repository secret"**
4. Configure:
   - **Name**: `CRON_SECRET`
   - **Secret**: (o mesmo valor que está na Vercel)
5. Clique em **"Add secret"**

Depois, edite o arquivo `.github/workflows/lembretes.yml` e descomente as linhas que usam o secret.

## ✅ Passo 3: Verificar se Está Funcionando

### Opção 1: Executar Manualmente (Teste)

1. GitHub → Seu Repositório → **Actions**
2. Clique em **"Lembretes Automáticos"** (no menu lateral)
3. Clique em **"Run workflow"** (botão no topo direito)
4. Selecione a branch `main`
5. Clique em **"Run workflow"**
6. Aguarde alguns segundos
7. Clique na execução que apareceu
8. Veja os logs para verificar se funcionou

### Opção 2: Verificar Logs da Vercel

1. Após o workflow executar, vá para Vercel Dashboard
2. Vá em **Logs**
3. Procure por: `=== CRON LEMBRETES INICIADO ===`
4. Deve aparecer a cada 5 minutos

## 📊 Como Funciona

1. **GitHub Actions** executa a cada 5 minutos (automaticamente)
2. Faz uma requisição GET para: `https://seu-dominio.vercel.app/api/cron/lembretes`
3. A Vercel processa e envia os lembretes
4. Tudo acontece automaticamente!

## ⚠️ Importante

- O workflow só executa se o código estiver na branch `main` (ou a branch configurada)
- GitHub Actions é **gratuito** para repositórios públicos
- Para repositórios privados, há limites no plano gratuito (mas suficiente para este uso)

## 🐛 Troubleshooting

### Problema: Workflow não executa

**Solução:**
1. Verifique se o arquivo está em `.github/workflows/lembretes.yml`
2. Verifique se está na branch `main`
3. Verifique se o arquivo foi commitado e enviado para o GitHub

### Problema: Erro 404 na URL

**Solução:**
1. Verifique se a URL está correta
2. Teste manualmente no navegador: `https://seu-dominio.vercel.app/api/cron/lembretes`
3. Deve retornar um JSON

### Problema: Erro 401 (Unauthorized)

**Solução:**
1. Se você configurou `CRON_SECRET`, adicione como secret no GitHub
2. Ou remova a verificação de `CRON_SECRET` temporariamente

## ✅ Checklist Final

- [ ] Arquivo `.github/workflows/lembretes.yml` existe
- [ ] URL ajustada para seu domínio da Vercel
- [ ] Código commitado e enviado para o GitHub
- [ ] Workflow aparece em **Actions** → **Lembretes Automáticos**
- [ ] Teste manual executado com sucesso
- [ ] Logs aparecem na Vercel a cada 5 minutos
- [ ] (Opcional) `CRON_SECRET` configurado no GitHub

## 🎯 Próximos Passos

Após configurar:
1. O workflow começará a executar automaticamente
2. Você pode ver o histórico em **Actions** → **Lembretes Automáticos**
3. Os lembretes serão enviados automaticamente a cada 5 minutos

## 📝 Notas

- O cron do GitHub usa **UTC**, então `*/5 * * * *` significa a cada 5 minutos em UTC
- Você pode ajustar a frequência editando o cron expression
- Para executar manualmente, use **"Run workflow"** em Actions
