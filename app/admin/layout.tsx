'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/admin', label: 'Přehled' },
  { href: '/admin/clients', label: 'Klienti' },
  { href: '/admin/employees', label: 'Zaměstnanci' },
  { href: '/admin/tasks', label: 'Úkoly' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
          <span className="font-semibold text-blue-700 text-lg mr-2">Marketing Tasks</span>
          <nav className="flex gap-1">
            {nav.map((n) => {
              const active = n.href === '/admin' ? path === '/admin' : path.startsWith(n.href)
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {n.label}
                </Link>
              )
            })}
          </nav>
          <div className="ml-auto">
            <Link href="/app" className="text-sm text-gray-500 hover:text-blue-600">
              → Pohled zaměstnance
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  )
}
