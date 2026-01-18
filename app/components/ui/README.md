# Componentes UI Reutilizáveis - ORGANIZAPAY

Componentes modernos e acessíveis com a identidade verde do ORGANIZAPAY.

## Dialog (Modal)

Componente de diálogo/modal reutilizável.

### Uso Básico

```tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogActions } from '@/app/components/ui'
import { useToast } from '@/app/components/ui'

export function Example() {
  const [open, setOpen] = useState(false)
  const toast = useToast()

  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir Dialog</button>
      
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Confirmar ação"
        description="Esta ação não pode ser desfeita."
        size="md"
      >
        <p>Conteúdo do dialog aqui...</p>
        
        <DialogActions>
          <button onClick={() => setOpen(false)}>Cancelar</button>
          <button 
            onClick={() => {
              toast.success('Ação confirmada!')
              setOpen(false)
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
          >
            Confirmar
          </button>
        </DialogActions>
      </Dialog>
    </>
  )
}
```

### Props

- `open: boolean` - Controla se o dialog está aberto
- `onOpenChange: (open: boolean) => void` - Callback quando o estado muda
- `title?: string` - Título do dialog
- `description?: string` - Descrição/subtítulo
- `size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'` - Tamanho do dialog (padrão: 'md')
- `showCloseButton?: boolean` - Mostra botão de fechar (padrão: true)
- `closeOnOverlayClick?: boolean` - Fecha ao clicar no overlay (padrão: true)

## Toast (Notificações)

Sistema de notificações toast com diferentes tipos.

### Uso Básico

```tsx
'use client'

import { useToast } from '@/app/components/ui'

export function Example() {
  const toast = useToast()

  return (
    <div className="space-y-2">
      <button onClick={() => toast.success('Operação realizada com sucesso!')}>
        Sucesso
      </button>
      
      <button onClick={() => toast.error('Erro ao processar', 'Tente novamente mais tarde')}>
        Erro
      </button>
      
      <button onClick={() => toast.info('Nova atualização disponível')}>
        Info
      </button>
      
      <button onClick={() => toast.warning('Atenção: ação irreversível')}>
        Aviso
      </button>
    </div>
  )
}
```

### Métodos do useToast

- `toast.success(title, description?, duration?)` - Notificação de sucesso (verde)
- `toast.error(title, description?, duration?)` - Notificação de erro (vermelho)
- `toast.info(title, description?, duration?)` - Notificação informativa (azul)
- `toast.warning(title, description?, duration?)` - Notificação de aviso (amarelo)
- `toast.toast({ type, title, description, duration })` - Método genérico

### Duração

Por padrão, toasts desaparecem após 5 segundos. Passe `duration` em milissegundos para customizar, ou `0` para não fechar automaticamente.

### Exemplo Completo

```tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogActions, useToast } from '@/app/components/ui'

export function DeleteConfirmDialog({ itemName }: { itemName: string }) {
  const [open, setOpen] = useState(false)
  const toast = useToast()

  const handleDelete = async () => {
    try {
      // Sua lógica de deletar aqui
      await deleteItem()
      
      toast.success('Item deletado', `${itemName} foi removido com sucesso.`)
      setOpen(false)
    } catch (error) {
      toast.error('Erro ao deletar', 'Não foi possível remover o item.')
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}>Deletar</button>
      
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Confirmar exclusão"
        description="Esta ação não pode ser desfeita."
        size="sm"
      >
        <p className="text-gray-700">
          Tem certeza que deseja deletar <strong>{itemName}</strong>?
        </p>
        
        <DialogActions>
          <button 
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancelar
          </button>
          <button 
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg"
          >
            Deletar
          </button>
        </DialogActions>
      </Dialog>
    </>
  )
}
```

## Características

- ✅ **Acessível**: ARIA labels, navegação por teclado (ESC para fechar)
- ✅ **Responsivo**: Funciona bem em mobile e desktop
- ✅ **Animado**: Transições suaves e modernas
- ✅ **Identidade**: Cores verde (emerald) do ORGANIZAPAY
- ✅ **Type-safe**: Totalmente tipado com TypeScript
- ✅ **Reutilizável**: Fácil de usar em qualquer parte do sistema
