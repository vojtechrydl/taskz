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
      <header className="bg-[#161819] border-b border-[#2A2D30] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
          <div className="flex items-center gap-2.5 mr-2">
            <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
            <span className="font-semibold text-white text-sm">TASKZ</span>
          </div>
          <nav className="flex gap-0.5">
            {nav.map((n) => {
              const active = n.href === '/admin' ? path === '/admin' : path.startsWith(n.href)
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#7C3AED1A] text-[#A78BFA]'
                      : 'text-[#8B9099] hover:bg-[#1E2022] hover:text-[#F0F2F4]'
                  }`}
                >
                  {n.label}
                </Link>
              )
            })}
          </nav>
          <div className="ml-auto">
            <Link href="/app" className="text-sm text-[#8B9099] hover:text-[#F0F2F4] transition-colors">
              Pohled zaměstnance →
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  )
}
