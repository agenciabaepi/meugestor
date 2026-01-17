'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart, Plus, Check, Trash2, ListChecks, RefreshCw } from 'lucide-react'

type Lista = {
  id: string
  tenant_id: string
  nome: string
  tipo: string
  created_at: string
  updated_at: string
}

type ListaItem = {
  id: string
  lista_id: string
  nome: string
  quantidade: string | null
  unidade: string | null
  status: 'pendente' | 'comprado'
  created_at: string
  updated_at: string
}

type View = {
  lista: Lista
  pendentes: ListaItem[]
  comprados: ListaItem[]
}

async function safeJson(res: Response) {
  const txt = await res.text()
  try {
    return txt ? JSON.parse(txt) : {}
  } catch {
    return {}
  }
}

export function ListasClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [listas, setListas] = useState<Lista[]>([])
  const [activeListName, setActiveListName] = useState<string | null>(null)

  const [view, setView] = useState<View | null>(null)

  const [newListName, setNewListName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')

  const activeList = useMemo(
    () => (activeListName ? listas.find(l => l.nome === activeListName) || null : null),
    [listas, activeListName]
  )

  async function loadListas() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/listas', { cache: 'no-store' })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data?.error || 'Erro ao buscar listas')
      setListas(Array.isArray(data?.listas) ? data.listas : [])
      setActiveListName(data?.activeListName || null)
    } catch (e: any) {
      setError(e?.message || 'Erro ao buscar listas')
    } finally {
      setLoading(false)
    }
  }

  async function setActive(name: string) {
    setActiveListName(name)
    await fetch('/api/listas/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listName: name }),
    })
  }

  async function loadView(name: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/listas/by-name/${encodeURIComponent(name)}/items`, {
        cache: 'no-store',
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data?.error || 'Erro ao buscar itens')
      setView(data?.view || null)
    } catch (e: any) {
      setError(e?.message || 'Erro ao buscar itens')
      setView(null)
    } finally {
      setLoading(false)
    }
  }

  async function createList() {
    const nome = newListName.trim()
    if (!nome) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, tipo: 'compras' }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data?.error || 'Erro ao criar lista')
      setNewListName('')
      await loadListas()
      await setActive(data?.lista?.nome || nome)
      await loadView(data?.lista?.nome || nome)
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar lista')
    } finally {
      setLoading(false)
    }
  }

  async function deleteList(listId: string, listName: string) {
    const ok = window.confirm(`Apagar a lista "${listName}"?`)
    if (!ok) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/listas/${encodeURIComponent(listId)}`, {
        method: 'DELETE',
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data?.error || 'Erro ao apagar lista')

      // Se apagou a lista ativa, limpa seleção e view
      if (activeListName === listName) {
        setActiveListName(null)
        setView(null)
      }

      await loadListas()
    } catch (e: any) {
      setError(e?.message || 'Erro ao apagar lista')
    } finally {
      setLoading(false)
    }
  }

  async function addItem() {
    const listName = activeListName
    const itemName = newItemName.trim()
    if (!listName || !itemName) return

    setLoading(true)
    setError(null)
    try {
      const quantidade = newItemQty.trim() ? newItemQty.trim() : null
      const unidade = newItemUnit.trim() ? newItemUnit.trim() : null
      const res = await fetch(`/api/listas/by-name/${encodeURIComponent(listName)}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName, quantidade, unidade }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data?.error || 'Erro ao adicionar item')
      setNewItemName('')
      setNewItemQty('')
      setNewItemUnit('')
      await loadView(listName)
    } catch (e: any) {
      setError(e?.message || 'Erro ao adicionar item')
    } finally {
      setLoading(false)
    }
  }

  async function markDone(itemName: string) {
    const listName = activeListName
    if (!listName) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/listas/by-name/${encodeURIComponent(listName)}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName, action: 'mark_done' }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data?.error || 'Erro ao marcar item')
      await loadView(listName)
    } catch (e: any) {
      setError(e?.message || 'Erro ao marcar item')
    } finally {
      setLoading(false)
    }
  }

  async function removeItem(itemName: string) {
    const listName = activeListName
    if (!listName) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/listas/by-name/${encodeURIComponent(listName)}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName, action: 'remove' }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data?.error || 'Erro ao remover item')
      await loadView(listName)
    } catch (e: any) {
      setError(e?.message || 'Erro ao remover item')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    loadListas()
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    if (activeListName) loadView(activeListName)
    else setView(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeListName, isAuthenticated])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Listas</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Lista de compras e checklists do dia a dia
          </p>
        </div>

        <button
          onClick={loadListas}
          disabled={!isAuthenticated || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {!isAuthenticated && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 lg:px-8 py-5 bg-linear-to-r from-gray-50 to-white border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Faça login para ver suas listas</h2>
          </div>
          <div className="p-6 text-gray-600">
            Entre na sua conta para acessar e gerenciar suas listas.
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Coluna listas */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 bg-linear-to-r from-emerald-50 to-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-emerald-700 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Suas listas</h2>
                    <p className="text-xs text-gray-500">{listas.length} no total</p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder='Nova lista (ex: "mercado")'
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <button
                    onClick={createList}
                    disabled={loading || !newListName.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    Criar
                  </button>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  {listas.length === 0 ? (
                    <div className="text-sm text-gray-500 py-6 text-center">
                      Crie sua primeira lista.
                    </div>
                  ) : (
                    listas.map((l) => {
                      const active = l.nome === activeListName
                      return (
                        <div
                          key={l.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            void setActive(l.nome)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              void setActive(l.nome)
                            }
                          }}
                          className={[
                            'w-full text-left rounded-lg px-4 py-3 border transition-all',
                            active
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-800',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{l.nome}</div>
                              <div className="text-xs text-gray-500">tipo: {l.tipo}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {active && (
                                <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                  <ListChecks className="h-4 w-4" />
                                  ativa
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  deleteList(l.id, l.nome)
                                }}
                                disabled={loading}
                                className="inline-flex items-center justify-center rounded-lg bg-white p-2 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-red-600 disabled:opacity-60"
                                title="Apagar lista"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna itens */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 bg-linear-to-r from-gray-50 to-white border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">
                  {activeListName ? `Lista: ${activeListName}` : 'Selecione uma lista'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Pendentes primeiro • depois comprados
                </p>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {activeListName && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder='Adicionar item (ex: "leite")'
                      className="sm:col-span-6 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <input
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      placeholder="Qtd (opcional)"
                      className="sm:col-span-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <input
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      placeholder='Unid (ex: "litro")'
                      className="sm:col-span-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <button
                      onClick={addItem}
                      disabled={loading || !newItemName.trim()}
                      className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                )}

                {!activeListName && (
                  <div className="text-sm text-gray-500 py-10 text-center">
                    Escolha uma lista à esquerda para ver os itens.
                  </div>
                )}

                {activeListName && !view && (
                  <div className="text-sm text-gray-500 py-10 text-center">
                    {loading ? 'Carregando...' : 'Sem dados ainda.'}
                  </div>
                )}

                {activeListName && view && (
                  <div className="space-y-6">
                    {/* Pendentes */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Pendentes</h3>
                      {view.pendentes.length === 0 ? (
                        <div className="text-sm text-gray-500">Nada pendente.</div>
                      ) : (
                        <div className="space-y-2">
                          {view.pendentes.map((it) => (
                            <div
                              key={it.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-linear-to-r from-gray-50 to-white px-4 py-3"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900 truncate">{it.nome}</div>
                                {(it.quantidade || it.unidade) && (
                                  <div className="text-xs text-gray-500">
                                    {[it.quantidade, it.unidade].filter(Boolean).join(' ')}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => markDone(it.nome)}
                                  disabled={loading}
                                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  <Check className="h-4 w-4" />
                                  Comprado
                                </button>
                                <button
                                  onClick={() => removeItem(it.nome)}
                                  disabled={loading}
                                  className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
                                >
                                  <Trash2 className="h-4 w-4 text-gray-500" />
                                  Remover
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Comprados */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Comprados</h3>
                      {view.comprados.length === 0 ? (
                        <div className="text-sm text-gray-500">Nenhum ainda.</div>
                      ) : (
                        <div className="space-y-2">
                          {view.comprados.map((it) => (
                            <div
                              key={it.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 opacity-80"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-700 truncate line-through">{it.nome}</div>
                                {(it.quantidade || it.unidade) && (
                                  <div className="text-xs text-gray-500">
                                    {[it.quantidade, it.unidade].filter(Boolean).join(' ')}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removeItem(it.nome)}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4 text-gray-500" />
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

