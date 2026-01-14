'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, AlertCircle } from 'lucide-react'

export default function WebhookConfigPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [appUrl, setAppUrl] = useState('')
  const [verifyToken, setVerifyToken] = useState('')

  useEffect(() => {
    // Pega a URL atual
    const currentUrl = window.location.origin
    setAppUrl(currentUrl)
    
    // Tenta pegar o verify token do ambiente (se disponível no cliente)
    // Nota: Variáveis sem NEXT_PUBLIC_ não estão disponíveis no cliente
    // O usuário precisa verificar no .env.local ou Vercel
    setVerifyToken('093718') // Valor padrão do WHATSAPP_SETUP.md
  }, [])

  const webhookUrl = `${appUrl}/api/whatsapp/webhook`
  const verifyTokenValue = verifyToken || '093718'

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  const steps = [
    {
      number: 1,
      title: 'Acesse o Meta for Developers',
      description: 'Vá para o painel de gerenciamento do seu app',
      link: 'https://developers.facebook.com/apps',
      linkText: 'Abrir Meta for Developers',
    },
    {
      number: 2,
      title: 'Selecione seu App',
      description: 'Escolha o app do WhatsApp Business que você configurou',
    },
    {
      number: 3,
      title: 'Vá em WhatsApp → Configuração',
      description: 'No menu lateral, clique em "WhatsApp" e depois em "Configuração"',
    },
    {
      number: 4,
      title: 'Configure o Webhook',
      description: 'Na seção "Webhook", clique em "Configurar webhook"',
    },
    {
      number: 5,
      title: 'Cole a URL do Webhook',
      description: 'Cole a URL abaixo no campo "URL de retorno de chamada"',
      value: webhookUrl,
    },
    {
      number: 6,
      title: 'Cole o Verify Token',
      description: 'Cole o token abaixo no campo "Token de verificação"',
      value: verifyTokenValue,
    },
    {
      number: 7,
      title: 'Selecione os Campos',
      description: 'Marque os campos: "messages" e "message_status"',
    },
    {
      number: 8,
      title: 'Verifique e Salve',
      description: 'Clique em "Verificar e salvar" para confirmar a configuração',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Configuração do Webhook WhatsApp
          </h1>
          <p className="text-gray-600">
            Siga os passos abaixo para configurar o webhook no Meta for Developers
          </p>
        </div>

        {/* Informações Importantes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Informações Importantes</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• A URL do webhook deve ser acessível publicamente (não funciona em localhost)</li>
                <li>• O Verify Token deve ser exatamente igual ao configurado no seu .env.local</li>
                <li>• Após configurar, teste enviando uma mensagem para o número do WhatsApp</li>
                <li>• Se estiver em desenvolvimento local, use um túnel como ngrok ou Cloudflare Tunnel</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dados para Configuração */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Dados para Configuração
          </h2>
          
          <div className="space-y-4">
            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL do Webhook (Callback URL)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {copied === 'webhook' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Verify Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verify Token
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={verifyTokenValue}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard(verifyTokenValue, 'token')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {copied === 'token' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Valor padrão: 093718 (verifique no seu .env.local se for diferente)
              </p>
            </div>

            {/* Campos do Webhook */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campos do Webhook (Webhook fields)
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" checked readOnly className="mr-2" />
                    <span className="text-sm text-gray-700">messages</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked readOnly className="mr-2" />
                    <span className="text-sm text-gray-700">message_status</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Passo a Passo */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Passo a Passo
          </h2>
          
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.number} className="flex gap-4">
                {/* Número do Passo */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {step.number}
                  </div>
                </div>
                
                {/* Conteúdo */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {step.description}
                  </p>
                  
                  {/* Link */}
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      {step.linkText}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  
                  {/* Valor para copiar */}
                  {step.value && (
                    <div className="mt-3 flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded text-sm font-mono break-all">
                        {step.value}
                      </code>
                      <button
                        onClick={() => copyToClipboard(step.value!, `step-${step.number}`)}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors flex items-center gap-2"
                      >
                        {copied === `step-${step.number}` ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teste */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">
            ✅ Após Configurar
          </h3>
          <p className="text-sm text-green-800 mb-3">
            Após configurar o webhook, teste enviando uma mensagem para o número do WhatsApp configurado.
            Você pode verificar os logs na Vercel ou no console do servidor.
          </p>
          <a
            href="/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium"
          >
            Testar Health Check
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Voltar */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            ← Voltar para a página inicial
          </a>
        </div>
      </div>
    </div>
  )
}
