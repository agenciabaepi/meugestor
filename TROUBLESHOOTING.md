# 🔧 Troubleshooting - Meu Gestor

## Problemas Comuns e Soluções

### 1. Erro ao executar scripts

**Problema**: `zsh: command not found` ou erro de permissão

**Solução**:
```bash
# Dar permissão de execução
chmod +x scripts/*.js

# Ou executar diretamente com node
node scripts/check-env.js
```

### 2. Variáveis de ambiente não encontradas

**Problema**: Script retorna variáveis faltando

**Solução**:
1. Verifique se o arquivo `.env.local` existe
2. Verifique se as variáveis estão no formato correto:
   ```env
   VARIAVEL=valor
   ```
3. Não use espaços antes ou depois do `=`
4. Não use aspas (a menos que necessário)

### 3. Erro ao instalar dependências

**Problema**: `npm install` falha

**Solução**:
```bash
# Limpar cache
npm cache clean --force

# Deletar node_modules e package-lock.json
rm -rf node_modules package-lock.json

# Reinstalar
npm install
```

### 4. Erro de conexão com Supabase

**Problema**: Erro ao conectar ao banco

**Solução**:
1. Verifique as credenciais no `.env.local`
2. Verifique se as migrations foram aplicadas
3. Verifique se o projeto Supabase está ativo
4. Teste a conexão no Supabase Dashboard

### 5. Webhook do WhatsApp não funciona

**Problema**: Mensagens não chegam

**Solução**:
1. Verifique se o webhook está configurado no Meta for Developers
2. Verifique se a URL está correta (deve ser acessível publicamente)
3. Verifique o `WHATSAPP_VERIFY_TOKEN`
4. Teste a verificação do webhook manualmente

### 6. Erro ao processar áudio/imagem

**Problema**: IA não processa mídia

**Solução**:
1. Verifique se `OPENAI_API_KEY` está configurada
2. Verifique se há créditos na conta OpenAI
3. Verifique os logs do servidor
4. Verifique o tamanho do arquivo (limites: áudio 25MB, imagem 20MB)

### 7. Dashboard não carrega dados

**Problema**: Páginas do dashboard vazias

**Solução**:
1. Verifique se está autenticado
2. Verifique se há dados no banco
3. Verifique o console do navegador (F12)
4. Verifique os logs do servidor

### 8. Cron jobs não executam

**Problema**: Lembretes não são enviados

**Solução**:
1. Verifique se o `vercel.json` está configurado
2. Verifique se o cron está ativo na Vercel
3. Teste manualmente: `GET /api/cron/lembretes`
4. Verifique os logs na Vercel

### 9. Erro de build no Vercel

**Problema**: Deploy falha

**Solução**:
1. Verifique se todas as variáveis de ambiente estão configuradas
2. Verifique se não há erros de TypeScript (`npm run build` localmente)
3. Verifique os logs de build na Vercel
4. Verifique se todas as dependências estão no `package.json`

### 10. Erro de TypeScript

**Problema**: Erros de tipo

**Solução**:
```bash
# Verificar erros
npm run lint

# Corrigir automaticamente (se possível)
npm run format
```

## 🆘 Ainda com problemas?

1. **Verifique os logs**:
   - Terminal: `npm run dev`
   - Vercel: Dashboard → Logs
   - Supabase: Dashboard → Logs

2. **Teste componentes isoladamente**:
   - Health check: `GET /api/health`
   - Webhook: `GET /api/whatsapp/webhook?hub.verify_token=...`

3. **Verifique a documentação**:
   - `INICIO_RAPIDO.md`
   - `DEPLOY_GUIDE.md`
   - `TESTES.md`

4. **Comandos úteis**:
   ```bash
   # Verificar configuração
   npm run check-env
   
   # Verificar build
   npm run build
   
   # Verificar lint
   npm run lint
   
   # Limpar e reinstalar
   rm -rf .next node_modules && npm install
   ```

## 📞 Suporte

Se o problema persistir:
1. Verifique os logs completos
2. Documente o erro exato
3. Verifique a versão do Node.js (`node --version`)
4. Verifique a versão do npm (`npm --version`)

---

**💡 Dica**: Sempre verifique os logs primeiro - eles geralmente contêm a solução!
