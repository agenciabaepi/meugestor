import Link from 'next/link'
import { Smartphone, Bot, Wallet, Calendar, CheckCircle, ArrowRight, Zap, Shield, BarChart } from 'lucide-react'
import { LOGO_URL } from '@/lib/constants'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="relative h-12 w-[260px] sm:h-14 sm:w-[320px] lg:h-16 lg:w-[420px] flex items-center justify-center">
                <img
                  src={LOGO_URL}
                  alt="ORGANIZAPAY"
                  className="h-full w-auto object-contain"
                />
              </div>
              <h1 className="sr-only">ORGANIZAPAY</h1>
            </div>
            <p className="text-xl sm:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto">
              Gerencie suas finanças e compromissos com inteligência artificial
            </p>
            <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
              Tudo que você precisa, direto no WhatsApp. Simples, rápido e inteligente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-emerald-700 text-white px-8 py-4 rounded-lg font-semibold hover:bg-emerald-800 transition-colors text-lg shadow-lg"
              >
                Acessar Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Uma solução completa para gestão pessoal e empresarial
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <Smartphone className="w-12 h-12 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Via WhatsApp
              </h3>
              <p className="text-gray-600">
                Converse naturalmente e registre gastos, crie compromissos e consulte informações diretamente pelo WhatsApp
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <Bot className="w-12 h-12 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                IA Avançada
              </h3>
              <p className="text-gray-600">
                Processa textos, transcreve áudios e extrai dados de comprovantes automaticamente com GPT-4o
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <Wallet className="w-12 h-12 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Controle Financeiro
              </h3>
              <p className="text-gray-600">
                Registre gastos, visualize gráficos detalhados e gere relatórios completos da sua situação financeira
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <Calendar className="w-12 h-12 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Agenda Inteligente
              </h3>
              <p className="text-gray-600">
                Crie compromissos facilmente e receba lembretes automáticos via WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 sm:py-24 bg-gradient-to-br from-gray-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              <span>Por que escolher o</span>{' '}
              <span className="inline-flex align-middle relative h-7 w-[170px] flex items-center justify-center">
                <img
                  src={LOGO_URL}
                  alt="ORGANIZAPAY"
                  className="h-full w-auto object-contain"
                />
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <Zap className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Rápido e Prático
              </h3>
              <p className="text-gray-600">
                Tudo pelo WhatsApp. Sem necessidade de instalar apps ou acessar sistemas complexos
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <Shield className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Seguro e Confiável
              </h3>
              <p className="text-gray-600">
                Seus dados protegidos com criptografia e isolamento completo por conta
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <BarChart className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Relatórios Completos
              </h3>
              <p className="text-gray-600">
                Visualize gráficos, estatísticas e análises detalhadas no dashboard web
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 sm:py-24 bg-gradient-to-r from-emerald-800 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Acesse o dashboard e comece a gerenciar suas finanças de forma inteligente
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-white text-emerald-800 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg shadow-lg"
          >
            Acessar Dashboard
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="relative h-7 w-[180px] flex items-center justify-center">
                <img
                  src={LOGO_URL}
                  alt="ORGANIZAPAY"
                  className="h-full w-auto object-contain brightness-0 invert"
                />
              </div>
              <p className="sr-only">ORGANIZAPAY</p>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
