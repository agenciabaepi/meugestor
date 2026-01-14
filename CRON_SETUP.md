# ⏰ Sistema de Lembretes Automáticos

## ✅ Implementação Concluída

O sistema de lembretes automáticos foi implementado com sucesso!

## 📋 Arquivos Criados

1. **`lib/jobs/lembretes.ts`** - Lógica de lembretes
   - `buscarCompromissosParaLembrete()` - Busca compromissos que precisam de lembrete
   - `enviarLembrete()` - Envia lembrete via WhatsApp
   - `processarLembretes()` - Processa lembretes para todos os tenants

2. **`app/api/cron/lembretes/route.ts`** - Endpoint para cron job
   - POST: Executa processamento de lembretes
   - GET: Health check

3. **`vercel.json`** - Configuração de cron no Vercel

## 🎯 Funcionalidades

### 1. Busca Inteligente
- Busca compromissos próximos (próxima hora)
- Filtra apenas os que ainda não foram lembrados
- Considera antecedência configurável (padrão: 60 minutos)

### 2. Envio de Lembretes
- Mensagens formatadas e amigáveis
- Inclui título, data, hora e descrição
- Enviadas via WhatsApp Business API

### 3. Controle de Envio
- Campo `reminder_sent` marca compromissos lembrados
- Evita envio duplicado
- Pode ser resetado se necessário

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# Opcional: Token de segurança para cron
CRON_SECRET=seu_token_secreto_aqui
```

### 2. Vercel Cron (Recomendado)

O arquivo `vercel.json` já está configurado:

```json
{
  "crons": [
    {
      "path": "/api/cron/lembretes",
      "schedule": "0 * * * *"  // A cada hora
    }
  ]
}
```

**Como ativar:**
1. Faça deploy na Vercel
2. Acesse **Settings > Cron Jobs**
3. O cron será ativado automaticamente

### 3. Alternativas de Cron

#### GitHub Actions
```yaml
name: Lembretes
on:
  schedule:
    - cron: '0 * * * *'  # A cada hora
jobs:
  lembrete:
    runs-on: ubuntu-latest
    steps:
      - name: Executar Lembretes
        run: |
          curl -X POST https://seu-dominio.com/api/cron/lembretes \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

#### Cron Externo (cron-job.org, etc)
- URL: `https://seu-dominio.com/api/cron/lembretes`
- Método: POST
- Headers: `Authorization: Bearer seu_token`
- Frequência: A cada hora

## 📅 Frequência Recomendada

- **A cada hora**: Ideal para lembretes com 1 hora de antecedência
- **A cada 30 minutos**: Para lembretes mais frequentes
- **A cada 15 minutos**: Para lembretes muito próximos

## 💬 Exemplo de Mensagem

```
⏰ *Lembrete de Compromisso*

📅 Reunião com Cliente
🕐 14:00
📆 segunda-feira, 15 de janeiro

📝 Apresentar proposta de projeto

_Seu compromisso está chegando! 🎯_
```

## 🔧 Personalização

### Alterar Antecedência

Edite `lib/jobs/lembretes.ts`:

```typescript
const DEFAULT_CONFIG: LembreteConfig = {
  antecedenciaMinutos: 30, // 30 minutos antes
}
```

### Personalizar Mensagem

Edite a função `formatarMensagemLembrete()` em `lib/jobs/lembretes.ts`

## 🔐 Segurança

- ✅ Token de autenticação opcional
- ✅ Validação de requisições
- ✅ Logs de execução
- ✅ Tratamento de erros

## 📊 Monitoramento

O endpoint retorna estatísticas:

```json
{
  "success": true,
  "sucesso": 5,
  "erros": 0,
  "total": 5,
  "timestamp": "2024-01-15T14:00:00.000Z"
}
```

## ⚠️ Limitações

1. **Rate Limits do WhatsApp**: Respeite os limites da API
2. **Janela de 24h**: Só pode enviar mensagens dentro de 24h após receber
3. **Custo**: Cada lembrete conta como uma mensagem

## 🚀 Próximos Passos

- [ ] Configurar cron no Vercel após deploy
- [ ] Testar envio de lembretes
- [ ] Monitorar logs e estatísticas
- [ ] Ajustar antecedência conforme necessário

## 📚 Documentação

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
