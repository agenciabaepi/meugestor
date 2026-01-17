/**
 * Normalização única (listas e itens) para comparação semântica.
 *
 * Regras:
 * - lowercase
 * - remove acentos
 * - remove caracteres especiais (mantém letras/números)
 * - remove artigos/preposições irrelevantes (de, da, do, das, dos, para, pra)
 * - remove espaços duplicados
 * - trim
 * - plural simples (ex: "peliculas" -> "pelicula") para evitar duplicação óbvia
 */

export function normalizeText(input: string): string {
  const raw = String(input || '').trim()
  if (!raw) return ''

  const stopwords = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'pra', 'por', 'com'])

  const cleaned = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // remove caracteres especiais (mantém letras/números) virando espaço
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

  const tokens = cleaned
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !stopwords.has(t))
    .map((t) => {
      // plural simples: remove "s" final (ex: leite/leites, peliculas/pelicula)
      if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1)
      return t
    })

  return tokens.join(' ').trim().replace(/\s+/g, ' ')
}

