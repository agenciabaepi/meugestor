# 📝 Configurar Cron Externo - Passo a Passo Visual

## 🎯 Objetivo
Fazer o sistema de lembretes rodar automaticamente a cada 5 minutos usando um serviço externo gratuito.

## ✅ Opção 1: Cron-job.org (Mais Fácil)

### Passo 1: Acessar o Site
1. Abra seu navegador
2. Acesse: **https://cron-job.org**
3. Você verá a página inicial

### Passo 2: Criar Conta
1. Clique no botão **"Sign up"** ou **"Register"** (canto superior direito)
2. Preencha:
   - **Email**: Seu email
   - **Password**: Uma senha
3. Clique em **"Create account"** ou **"Sign up"**
4. Verifique seu email (se necessário)

### Passo 3: Fazer Login
1. Após criar a conta, faça login
2. Você será redirecionado para o dashboard

### Passo 4: Criar o Cron Job
1. No dashboard, procure por um botão que diz:
   - **"Create cronjob"** ou
   - **"New cronjob"** ou
   - Um botão **"+"** ou **"Add"**
2. Clique nesse botão

### Passo 5: Preencher o Formulário
Você verá um formulário. Preencha:

**Title (Título):**
```
Lembretes Meu Gestor
```

**Address (URL):**
```
https://seu-dominio.vercel.app/api/cron/lembretes
```
⚠️ **IMPORTANTE**: Substitua `seu-dominio` pelo seu domínio real da Vercel (ex: `meugestor.vercel.app`)

**Schedule (Agendamento):**
- Procure por uma opção que diz **"Every 5 minutes"** ou
- Selecione **"Custom"** e digite: `*/5 * * * *`

**Request Method (Método):**
- Selecione **"GET"**

**Outras opções:**
- Deixe o resto como padrão

### Passo 6: Salvar
1. Clique em **"Create"** ou **"Save"** ou **"Create cronjob"**
2. O cron job será criado

### Passo 7: Testar
1. Na lista de cron jobs, encontre o que você criou
2. Procure por um botão **"Run now"** ou **"Execute now"**
3. Clique para testar imediatamente
4. Vá para a Vercel Dashboard → **Logs**
5. Procure por: `=== CRON LEMBRETES INICIADO ===`
6. Se aparecer, está funcionando! ✅

## ✅ Opção 2: EasyCron (Alternativa)

Se o cron-job.org não funcionar:

1. Acesse: **https://www.easycron.com**
2. Crie uma conta gratuita
3. Configure similar ao cron-job.org

## 🔍 Como Descobrir Seu Domínio da Vercel

1. Acesse o **Vercel Dashboard**
2. Selecione seu projeto
3. Vá em **Settings** → **Domains**
4. Você verá o domínio (ex: `meugestor.vercel.app`)
5. Ou vá em **Deployments** → clique no último deploy → veja a URL

## 📊 Verificar se Está Funcionando

### Após Configurar:
1. Aguarde 5 minutos
2. Vercel Dashboard → **Logs**
3. Filtre por: `cron` ou `lembretes`
4. Você deve ver logs a cada 5 minutos:
   ```
   === CRON LEMBRETES INICIADO ===
   === PROCESSAR LEMBRETES INICIADO ===
   ```

### Se Não Aparecer:
1. Verifique se a URL está correta
2. Teste manualmente: Acesse `https://seu-dominio.vercel.app/api/cron/lembretes` no navegador
3. Deve retornar um JSON com o resultado

## ⚠️ Problemas Comuns

### Problema: "URL não encontrada"
**Solução**: Verifique se o domínio está correto e se o deploy foi feito

### Problema: "Timeout"
**Solução**: O processamento pode demorar. Aumente o timeout no cron-job.org (se houver opção)

### Problema: "Não aparece nos logs"
**Solução**: 
1. Teste manualmente a URL no navegador
2. Verifique se retorna JSON
3. Se funcionar manualmente, o problema é no agendamento do cron externo

## 🎯 Checklist Final

- [ ] Conta criada no cron-job.org
- [ ] Cron job criado com a URL correta
- [ ] Schedule configurado para a cada 5 minutos
- [ ] Teste manual executado com sucesso
- [ ] Logs aparecem na Vercel a cada 5 minutos

## 🚀 Próximos Passos

Após configurar:
1. O sistema começará a enviar lembretes automaticamente
2. Você pode verificar os logs na Vercel
3. Os lembretes serão enviados via WhatsApp quando os compromissos estiverem próximos
