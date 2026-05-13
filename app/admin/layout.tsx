'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const nav = [
  { href: '/admin', label: 'Přehled' },
  { href: '/admin/clients', label: 'Klienti' },
  { href: '/admin/employees', label: 'Zaměstnanci' },
  { href: '/admin/tasks', label: 'Úkoly' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const current = nav.find(n => n.href === '/admin' ? path === '/admin' : path.startsWith(n.href))

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#161819] border-b border-[#2A2D30] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-3 h-14">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
            <span className="font-semibold text-white text-sm">TASKZ</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-0.5 ml-2">
            {nav.map((n) => {
              const active = n.href === '/admin' ? path === '/admin' : path.startsWith(n.href)
              return (
                <Link key={n.href} href={n.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active ? 'bg-[#7C3AED1A] text-[#A78BFA]' : 'text-[#8B9099] hover:bg-[#1E2022] hover:text-[#F0F2F4]'
                  }`}
                >
                  {n.label}
                </Link>
              )
            })}
          </nav>

          {/* Mobile: current page label */}
          <span className="md:hidden text-sm text-[#A78BFA] font-medium ml-1">{current?.label}</span>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/app" className="hidden md:block text-sm text-[#8B9099] hover:text-[#F0F2F4] transition-colors">
              Pohled zaměstnance →
            </Link>
            {/* Mobile hamburger */}
            <button
              className="md:hidden btn-ghost p-1.5"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              <div className="flex flex-col gap-1.5 w-5">
                <span className={`block h-0.5 bg-[#8B9099] transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block h-0.5 bg-[#8B9099] transition-all ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-[#8B9099] transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#2A2D30] bg-[#161819] px-4 py-2">
            {nav.map((n) => {
              const active = n.href === '/admin' ? path === '/admin' : path.startsWith(n.href)
              return (
                <Link key={n.href} href={n.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    active ? 'text-[#A78BFA] bg-[#7C3AED1A]' : 'text-[#8B9099] hover:text-[#F0F2F4]'
                  }`}
                >
                  {n.label}
                </Link>
              )
            })}
            <Link href="/app" onClick={() => setMenuOpen(false)}
              className="flex items-center px-3 py-2.5 text-sm text-[#8B9099] hover:text-[#F0F2F4]">
              Pohled zaměstnance →
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 overflow-x-hidden">{children}</main>
    </div>
  )
}
