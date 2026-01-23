import jsPDF from 'jspdf'
import { formatCurrency } from './format-currency'
import type { Financeiro } from '@/lib/db/types'

interface RelatorioMensalData {
  receitas: Financeiro[]
  despesas: Financeiro[]
  todasTransacoes: Financeiro[]
  totalReceitas: number
  totalDespesas: number
  saldo: number
  mes: string
  ano: number
}

/**
 * Gera um PDF bonito com o relatório mensal
 */
export function generateMonthlyReportPDF(data: RelatorioMensalData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let yPosition = margin

  // Cores do sistema (valores RGB do Tailwind)
  // Emerald (cor primária do sistema)
  const primaryColorR = 4
  const primaryColorG = 120
  const primaryColorB = 87
  // Green-600 (receitas/sucesso)
  const successColorR = 22
  const successColorG = 163
  const successColorB = 74
  // Red-600 (despesas/erro)
  const dangerColorR = 220
  const dangerColorG = 38
  const dangerColorB = 38
  // Blue-600 (informações/caixa)
  const infoColorR = 37
  const infoColorG = 99
  const infoColorB = 235
  // Gray-500 (textos)
  const grayColorR = 107
  const grayColorG = 114
  const grayColorB = 128
  // Gray-100 (fundos claros)
  const lightGrayColorR = 243
  const lightGrayColorG = 244
  const lightGrayColorB = 246

  // Função auxiliar para adicionar nova página se necessário
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Cabeçalho
  doc.setFillColor(primaryColorR, primaryColorG, primaryColorB)
  doc.rect(0, 0, pageWidth, 50, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório Financeiro Mensal', margin, 25)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`${data.mes} ${data.ano}`, margin, 35)

  yPosition = 60

  // Resumo Financeiro
  doc.setTextColor(grayColorR, grayColorG, grayColorB)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo Financeiro', margin, yPosition)
  yPosition += 10

  // Cards de resumo
  const cardHeight = 35
  const cardWidth = (contentWidth - 10) / 3

  // Card Receitas
  doc.setFillColor(lightGrayColorR, lightGrayColorG, lightGrayColorB)
  doc.rect(margin, yPosition, cardWidth, cardHeight, 'F')
  doc.setTextColor(grayColorR, grayColorG, grayColorB)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Receitas', margin + 8, yPosition + 8)
  doc.setTextColor(successColorR, successColorG, successColorB)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(data.totalReceitas), margin + 8, yPosition + 20)
  doc.setTextColor(grayColorR, grayColorG, grayColorB)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${data.receitas.length} registros`, margin + 8, yPosition + 28)

  // Card Despesas
  doc.setFillColor(lightGrayColorR, lightGrayColorG, lightGrayColorB)
  doc.rect(margin + cardWidth + 5, yPosition, cardWidth, cardHeight, 'F')
  doc.setTextColor(grayColorR, grayColorG, grayColorB)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Despesas', margin + cardWidth + 13, yPosition + 8)
  doc.setTextColor(dangerColorR, dangerColorG, dangerColorB)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(data.totalDespesas), margin + cardWidth + 13, yPosition + 20)
  doc.setTextColor(grayColorR, grayColorG, grayColorB)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${data.despesas.length} registros`, margin + cardWidth + 13, yPosition + 28)

  // Card Saldo (usa green-600 para positivo, red-600 para negativo)
  const saldoColorR = data.saldo >= 0 ? successColorR : dangerColorR
  const saldoColorG = data.saldo >= 0 ? successColorG : dangerColorG
  const saldoColorB = data.saldo >= 0 ? successColorB : dangerColorB
  doc.setFillColor(lightGrayColorR, lightGrayColorG, lightGrayColorB)
  doc.rect(margin + (cardWidth + 5) * 2, yPosition, cardWidth, cardHeight, 'F')
  doc.setTextColor(grayColorR, grayColorG, grayColorB)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Saldo', margin + (cardWidth + 5) * 2 + 8, yPosition + 8)
  doc.setTextColor(saldoColorR, saldoColorG, saldoColorB)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(data.saldo), margin + (cardWidth + 5) * 2 + 8, yPosition + 20)
  doc.setTextColor(grayColorR, grayColorG, grayColorB)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const saldoLabel = data.saldo >= 0 ? 'Superávit' : 'Déficit'
  doc.text(saldoLabel, margin + (cardWidth + 5) * 2 + 8, yPosition + 28)

  yPosition += cardHeight + 15

  // Receitas por Categoria
  if (data.receitas.length > 0) {
    checkPageBreak(30)
    doc.setTextColor(grayColorR, grayColorG, grayColorB)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Receitas por Categoria', margin, yPosition)
    yPosition += 8

    const receitasPorCategoria = new Map<string, number>()
    data.receitas.forEach((r) => {
      const cat = r.category || 'Outros'
      receitasPorCategoria.set(cat, (receitasPorCategoria.get(cat) || 0) + Number(r.amount))
    })

    const receitasCategorias = Array.from(receitasPorCategoria.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    receitasCategorias.forEach(([categoria, valor]) => {
      checkPageBreak(8)
      doc.setFillColor(lightGrayColorR, lightGrayColorG, lightGrayColorB)
      doc.rect(margin, yPosition - 5, contentWidth, 7, 'F')
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(categoria, margin + 3, yPosition)
      doc.setTextColor(successColorR, successColorG, successColorB)
      doc.setFont('helvetica', 'bold')
      doc.text(formatCurrency(valor), pageWidth - margin - 3, yPosition, { align: 'right' })
      yPosition += 8
    })

    yPosition += 5
  }

  // Despesas por Categoria
  if (data.despesas.length > 0) {
    checkPageBreak(30)
    doc.setTextColor(grayColorR, grayColorG, grayColorB)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Despesas por Categoria', margin, yPosition)
    yPosition += 8

    const despesasPorCategoria = new Map<string, number>()
    data.despesas.forEach((d) => {
      const cat = d.category || 'Outros'
      despesasPorCategoria.set(cat, (despesasPorCategoria.get(cat) || 0) + Number(d.amount))
    })

    const despesasCategorias = Array.from(despesasPorCategoria.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    despesasCategorias.forEach(([categoria, valor]) => {
      checkPageBreak(8)
      doc.setFillColor(lightGrayColorR, lightGrayColorG, lightGrayColorB)
      doc.rect(margin, yPosition - 5, contentWidth, 7, 'F')
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(categoria, margin + 3, yPosition)
      doc.setTextColor(dangerColorR, dangerColorG, dangerColorB)
      doc.setFont('helvetica', 'bold')
      doc.text(formatCurrency(valor), pageWidth - margin - 3, yPosition, { align: 'right' })
      yPosition += 8
    })

    yPosition += 10
  }

  // Extrato Completo
  checkPageBreak(20)
  doc.setTextColor(grayColorR, grayColorG, grayColorB)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Extrato Completo', margin, yPosition)
  yPosition += 8

  // Cabeçalho da tabela
  doc.setFillColor(primaryColorR, primaryColorG, primaryColorB)
  doc.rect(margin, yPosition - 5, contentWidth, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Data', margin + 3, yPosition + 2)
  doc.text('Descrição', margin + 35, yPosition + 2)
  doc.text('Categoria', margin + 100, yPosition + 2)
  doc.text('Valor', pageWidth - margin - 3, yPosition + 2, { align: 'right' })
  yPosition += 10

  // Ordena transações por data (mais recente primeiro)
  const transacoesOrdenadas = [...data.todasTransacoes].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return dateB - dateA
  })

  // Linhas do extrato
  transacoesOrdenadas.forEach((transacao) => {
    checkPageBreak(8)
    const isReceita = transacao.transaction_type === 'revenue'

    // Linha alternada
    const isEven = transacoesOrdenadas.indexOf(transacao) % 2 === 0
    if (isEven) {
      doc.setFillColor(lightGrayColorR, lightGrayColorG, lightGrayColorB)
      doc.rect(margin, yPosition - 4, contentWidth, 7, 'F')
    }

    // Data
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const dataFormatada = new Date(transacao.date).toLocaleDateString('pt-BR')
    doc.text(dataFormatada, margin + 3, yPosition)

    // Descrição (truncada se muito longa)
    let descricao = transacao.description || 'Sem descrição'
    if (descricao.length > 30) {
      descricao = descricao.substring(0, 27) + '...'
    }
    doc.text(descricao, margin + 35, yPosition)

    // Categoria (truncada se muito longa)
    let categoria = transacao.category || 'Outros'
    if (categoria.length > 20) {
      categoria = categoria.substring(0, 17) + '...'
    }
    doc.text(categoria, margin + 100, yPosition)

    // Valor
    const valorColorR = isReceita ? successColorR : dangerColorR
    const valorColorG = isReceita ? successColorG : dangerColorG
    const valorColorB = isReceita ? successColorB : dangerColorB
    doc.setTextColor(valorColorR, valorColorG, valorColorB)
    doc.setFont('helvetica', 'bold')
    const valorFormatado = formatCurrency(Number(transacao.amount))
    doc.text(valorFormatado, pageWidth - margin - 3, yPosition, { align: 'right' })

    yPosition += 8
  })

  // Rodapé
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setTextColor(grayColorR, grayColorG, grayColorB)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
  }

  // Salva o PDF
  const fileName = `relatorio-mensal-${data.mes.toLowerCase()}-${data.ano}.pdf`
  doc.save(fileName)
}
