'use client'

/**
 * EXEMPLO DE USO DOS COMPONENTES UI
 * 
 * Este arquivo demonstra como usar Dialog e Toast no sistema.
 * Você pode deletar este arquivo após entender o uso.
 */

import { useState } from 'react'
import { Dialog, DialogActions, useToast } from './index'

export function ExampleDialogAndToast() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const toast = useToast()

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Exemplos de UI Components</h1>

      {/* Exemplos de Toast */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Toasts</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toast.success('Operação realizada com sucesso!')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Toast Sucesso
          </button>
          
          <button
            onClick={() => toast.error('Erro ao processar', 'Tente novamente mais tarde')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Toast Erro
          </button>
          
          <button
            onClick={() => toast.info('Nova atualização disponível')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Toast Info
          </button>
          
          <button
            onClick={() => toast.warning('Atenção: ação irreversível')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Toast Aviso
          </button>
        </div>
      </div>

      {/* Exemplo de Dialog */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Dialog</h2>
        <button
          onClick={() => setDialogOpen(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Abrir Dialog
        </button>

        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Confirmar ação"
          description="Esta ação não pode ser desfeita."
          size="md"
        >
          <p className="text-gray-700 mb-4">
            Tem certeza que deseja continuar? Esta operação é irreversível.
          </p>

          <DialogActions>
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                toast.success('Ação confirmada!', 'A operação foi realizada com sucesso.')
                setDialogOpen(false)
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Confirmar
            </button>
          </DialogActions>
        </Dialog>
      </div>

      {/* Exemplo de Dialog de Confirmação de Exclusão */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Dialog de Exclusão</h2>
        <DeleteConfirmExample />
      </div>
    </div>
  )
}

function DeleteConfirmExample() {
  const [open, setOpen] = useState(false)
  const toast = useToast()

  const handleDelete = () => {
    // Simula uma operação assíncrona
    setTimeout(() => {
      toast.success('Item deletado', 'O item foi removido com sucesso.')
      setOpen(false)
    }, 500)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Deletar Item
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Confirmar exclusão"
        description="Esta ação não pode ser desfeita."
        size="sm"
      >
        <p className="text-gray-700">
          Tem certeza que deseja deletar este item? Esta ação é permanente.
        </p>

        <DialogActions>
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Deletar
          </button>
        </DialogActions>
      </Dialog>
    </>
  )
}
