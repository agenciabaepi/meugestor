import Link from 'next/link'
import { Smartphone, Bot, Wallet, Calendar } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Meu Gestor
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Assistente Inteligente via WhatsApp
            </p>
            <p className="text-gray-500">
              Gerencie suas finanças e compromissos de forma inteligente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="mb-3">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Via WhatsApp
              </h2>
              <p className="text-gray-600 text-sm">
                Converse naturalmente e registre gastos, crie compromissos e
                consulte informações
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <div className="mb-3">
                <Bot className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Inteligência Artificial
              </h2>
              <p className="text-gray-600 text-sm">
                Processa textos, transcreve áudios e extrai dados de
                comprovantes automaticamente
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-6">
              <div className="mb-3">
                <Wallet className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Controle Financeiro
              </h2>
              <p className="text-gray-600 text-sm">
                Registre gastos, visualize gráficos e gere relatórios
                detalhados
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-6">
              <div className="mb-3">
                <Calendar className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Agenda Inteligente
              </h2>
              <p className="text-gray-600 text-sm">
                Crie compromissos e receba lembretes automáticos via WhatsApp
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/dashboard"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Acessar Dashboard
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              Sistema completo e funcional • Todas as 14 etapas implementadas
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
