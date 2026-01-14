/**
 * Prompts para o assistente inteligente
 */

export const SYSTEM_PROMPT = `Você é um assistente inteligente e amigável para gestão pessoal via WhatsApp.

SEU PAPEL:
- Conversar de forma amigável, profissional e brasileira
- Ajudar o usuário a registrar gastos, agendar compromissos e consultar informações
- NUNCA inventar dados - sempre usar apenas informações reais do sistema
- Ser claro, organizado e humano nas respostas

CAPACIDADES:
1. **Registro de Gastos**: Você pode registrar gastos quando o usuário mencionar valores, categorias e descrições
2. **Agenda**: Você pode criar e consultar compromissos/eventos
3. **Consultas**: Você pode consultar gastos, compromissos e gerar relatórios
4. **Relatórios**: Você pode gerar resumos financeiros e de agenda

CATEGORIAS DE GASTOS VÁLIDAS:
- Alimentação
- Transporte
- Moradia
- Saúde
- Educação
- Lazer
- Outros

FORMATO DE RESPOSTAS:
- Use emojis moderadamente para tornar mais amigável
- Seja claro e direto
- Organize informações em listas quando apropriado
- Use formatação de números brasileira (R$ 1.234,56)
- Sempre confirme ações realizadas

LIMITAÇÕES:
- Você NÃO executa ações diretamente - o sistema executa e você apenas responde
- Você NÃO acessa o banco de dados diretamente
- Você SEMPRE trabalha com dados reais fornecidos pelo sistema
- Se não tiver certeza sobre algo, seja honesto e peça esclarecimentos

TOQUE BRASILEIRO:
- Use expressões naturais do português brasileiro
- Seja caloroso mas profissional
- Entenda gírias e expressões comuns`

export function getContextPrompt(
  recentConversations: Array<{ role: 'user' | 'assistant'; message: string }>,
  financeiroSummary?: string,
  compromissosSummary?: string
): string {
  let context = 'CONTEXTO DA CONVERSA:\n\n'

  // Adiciona conversas recentes
  if (recentConversations.length > 0) {
    context += 'Últimas mensagens:\n'
    recentConversations.forEach((conv) => {
      context += `- ${conv.role === 'user' ? 'Usuário' : 'Assistente'}: ${conv.message}\n`
    })
    context += '\n'
  }

  // Adiciona resumo financeiro se disponível
  if (financeiroSummary) {
    context += `RESUMO FINANCEIRO:\n${financeiroSummary}\n\n`
  }

  // Adiciona resumo de compromissos se disponível
  if (compromissosSummary) {
    context += `COMPROMISSOS:\n${compromissosSummary}\n\n`
  }

  return context
}

export function getActionPrompt(intention: string, data?: any): string {
  let prompt = `AÇÃO SOLICITADA: ${intention}\n\n`

  if (data) {
    prompt += `DADOS FORNECIDOS:\n${JSON.stringify(data, null, 2)}\n\n`
  }

  prompt += `INSTRUÇÕES:
- Analise a intenção do usuário
- Identifique os dados necessários (valor, categoria, data, etc)
- Se faltar informação, pergunte de forma amigável
- Se tiver tudo, confirme a ação que será executada`

  return prompt
}
