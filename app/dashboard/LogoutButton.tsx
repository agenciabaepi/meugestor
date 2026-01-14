'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-gray-600 hover:text-gray-900 text-sm px-3 py-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
    >
      {loading ? 'Saindo...' : 'Sair'}
    </button>
  )
}
