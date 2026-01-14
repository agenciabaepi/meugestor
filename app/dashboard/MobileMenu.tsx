'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  const menuItems = [
    { href: '/dashboard', label: 'Visão Geral' },
    { href: '/dashboard/financeiro', label: 'Financeiro' },
    { href: '/dashboard/agenda', label: 'Agenda' },
    { href: '/dashboard/relatorios', label: 'Relatórios' },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMenu}
        className="lg:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={closeMenu}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 lg:hidden transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="text-xl font-bold text-blue-600"
                >
                  Meu Gestor
                </Link>
                <button
                  onClick={closeMenu}
                  className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu items */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t">
                <Link
                  href="/"
                  onClick={closeMenu}
                  className="block px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                >
                  ← Voltar ao Início
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
