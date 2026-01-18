'use client'

import { useState } from 'react'
import { Dialog, DialogActions, useToast } from '@/app/components/ui'
import { MessageSquare, Trash2, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export function DialogDemo() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const toast = useToast()

  return (
    <>
      {/* Botão para abrir o menu de exemplos */}
      <div className="relative">
        <button
          onClick={() => setDialogOpen(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-md"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Testar UI</span>
        </button>

        {/* Dialog de Exemplos */}
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Componentes UI - ORGANIZAPAY"
          description="Teste os componentes de Dialog e Toast do sistema"
          size="lg"
        >
          <div className="space-y-6">
            {/* Seção de Toasts */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Toasts (Notificações)</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    toast.success('Operação realizada com sucesso!', 'Os dados foram salvos corretamente.')
                    setDialogOpen(false)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors border border-emerald-200"
                >
                  <CheckCircle className="w-4 h-4" />
                  Sucesso
                </button>
                
                <button
                  onClick={() => {
                    toast.error('Erro ao processar', 'Não foi possível completar a operação.')
                    setDialogOpen(false)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors border border-red-200"
                >
                  <AlertCircle className="w-4 h-4" />
                  Erro
                </button>
                
                <button
                  onClick={() => {
                    toast.info('Nova atualização disponível', 'Verifique as novidades do sistema.')
                    setDialogOpen(false)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
                >
                  <Info className="w-4 h-4" />
                  Info
                </button>
                
                <button
                  onClick={() => {
                    toast.warning('Atenção necessária', 'Esta ação pode ter consequências.')
                    setDialogOpen(false)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors border border-amber-200"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Aviso
                </button>
              </div>
            </div>

            {/* Seção de Dialog de Confirmação */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Dialog de Confirmação</h3>
              <button
                onClick={() => {
                  setDialogOpen(false)
                  setTimeout(() => setDeleteDialogOpen(true), 200)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors border border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                Abrir Dialog de Exclusão
              </button>
            </div>
          </div>

          <DialogActions>
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Exclusão de Exemplo */}
        <Dialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Confirmar exclusão"
          description="Esta ação não pode ser desfeita."
          size="sm"
        >
          <p className="text-gray-700 mb-4">
            Tem certeza que deseja deletar este item? Esta ação é permanente e não pode ser revertida.
          </p>

          <DialogActions>
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                toast.success('Item deletado', 'O item foi removido com sucesso.')
                setDeleteDialogOpen(false)
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Deletar
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </>
  )
}
