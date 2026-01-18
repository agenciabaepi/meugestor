/**
 * Parse de gastos multi-item (múltiplos produtos em uma única mensagem).
 * 
 * Exemplo de input:
 * "comprei no fornecedor Lojas das Tintas
 *  1 lata epox 25 litros 100 reais
 *  1 lata verniz 200 reais
 *  3 pincéis médios 43 reais"
 * 
 * Retorna array de itens, cada um com: quantidade, descrição, valor.
 */

export interface ParsedExpenseItem {
  quantidade: number | null
  descricao: string
  valor: number | null
}

export interface ParsedMultiItemExpense {
  fornecedor: string | null
  items: ParsedExpenseItem[]
}

/**
 * Parse de uma linha individual de item.
 * Padrões:
 * - "1 lata epox 25 litros 100 reais"
 * - "3 pincéis médios 43 reais"
 * - "1 produto 50 reais"
 */
function parseExpenseLine(line: string): ParsedExpenseItem | null {
  const trimmed = String(line || '').trim()
  if (!trimmed || trimmed.length === 0) return null

  // Ignora linhas que são claramente título de fornecedor
  if (/^comprei\s+no?\s+fornecedor/i.test(trimmed) || /^fornecedor\s*[:]/i.test(trimmed)) {
    return null
  }

  // Tenta extrair quantidade no início
  const qtyMatch = trimmed.match(/^(\d+)\s+/)
  const quantidade = qtyMatch ? parseInt(qtyMatch[1], 10) : null

  // Tenta extrair valor no final (reais, rs, r$)
  const valorMatch = trimmed.match(/\s+(\d+(?:[,.]\d+)?)\s*(?:reais?|rs?|r\$|r\$\s*\d+)/i)
  let valor: number | null = null
  if (valorMatch) {
    const valorStr = valorMatch[1].replace(',', '.')
    valor = parseFloat(valorStr) || null
  }

  // Descrição = resto da linha, removendo quantidade e valor
  let descricao = trimmed
  if (qtyMatch) {
    descricao = descricao.slice(qtyMatch[0].length)
  }
  if (valorMatch) {
    descricao = descricao.slice(0, descricao.lastIndexOf(valorMatch[0])).trim()
  }
  descricao = descricao.trim()

  // Se não tem descrição válida, retorna null
  if (!descricao || descricao.length < 2) return null

  // Se não tem valor, ainda é um item válido (valor pode vir depois)
  return {
    quantidade,
    descricao,
    valor,
  }
}

/**
 * Detecta se uma mensagem contém múltiplos itens de gasto.
 */
function hasMultipleItems(message: string): boolean {
  const lines = message
    .split(/\r?\n/g)
    .map((l) => String(l).trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) return false

  // Conta linhas que parecem ser itens (têm número, descrição, valor)
  const itemLines = lines.filter((line) => {
    const parsed = parseExpenseLine(line)
    return parsed !== null
  })

  return itemLines.length >= 2
}

/**
 * Extrai nome do fornecedor da mensagem (primeira linha ou linha que contenha "fornecedor").
 */
function extractSupplierFromMessage(message: string): string | null {
  const lines = message
    .split(/\r?\n/g)
    .map((l) => String(l).trim())
    .filter((l) => l.length > 0)

  // Procura linha com "fornecedor"
  for (const line of lines) {
    const match =
      line.match(/\bcomprei\s+no?\s+fornecedor\s+(.+?)(?:[.,;!\n]|$)/i) ||
      line.match(/\bfornecedor\s*[:]\s*(.+?)(?:[.,;!\n]|$)/i) ||
      line.match(/\bno\s+fornecedor\s+(.+?)(?:[.,;!\n]|$)/i)

    if (match) {
      const name = String(match[1] || '')
        .trim()
        .replace(/^["'“”‘']+/, '')
        .replace(/["'""'']+$/, '')
        .trim()
      if (name) return name
    }
  }

  // Se primeira linha não tem "fornecedor" mas parece ser título de fornecedor
  if (lines.length > 0) {
    const firstLine = lines[0]
    if (
      !firstLine.match(/\d+/g) && // não tem números
      firstLine.length > 3 &&
      firstLine.length < 100 // tamanho razoável
    ) {
      return firstLine
    }
  }

  return null
}

/**
 * Parse de gasto multi-item.
 * 
 * Se a mensagem contém múltiplos itens, retorna estrutura parseada.
 * Caso contrário, retorna null.
 */
export function parseMultiItemExpense(message: string): ParsedMultiItemExpense | null {
  if (!hasMultipleItems(message)) return null

  const fornecedor = extractSupplierFromMessage(message)

  const lines = message
    .split(/\r?\n/g)
    .map((l) => String(l).trim())
    .filter((l) => l.length > 0)

  const items: ParsedExpenseItem[] = []
  for (const line of lines) {
    // Ignora linha do fornecedor
    if (
      line.toLowerCase().includes('fornecedor') ||
      (fornecedor && line.toLowerCase().includes(fornecedor.toLowerCase()))
    ) {
      continue
    }

    const parsed = parseExpenseLine(line)
    if (parsed) {
      items.push(parsed)
    }
  }

  // Precisa ter pelo menos 2 itens válidos
  if (items.length < 2) return null

  return {
    fornecedor: fornecedor || null,
    items,
  }
}
