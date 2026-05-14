'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const nav = [
  { href: '/admin',           label: 'Přehled' },
  { href: '/admin/clients',   label: 'Klienti' },
  { href: '/admin/employees', label: 'Zaměstnanci' },
  { href: '/admin/tasks',     label: 'Úkoly' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const current = nav.find(n => n.href === '/admin' ? path === '/admin' : path.startsWith(n.href))

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Floating nav */}
      <div style={{ position: 'fixed', top: 18, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', pointerEvents: 'none', padding: '0 12px' }}>
        <div className="topnav" style={{ pointerEvents: 'auto', maxWidth: '100%' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px 8px 8px' }}>
            <div className="mark">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3.5h10M7 3.5V11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontWeight: 600, letterSpacing: '0.04em', fontSize: 13, color: 'var(--ink-1)' }}>TASKZ</span>
          </div>

          <div className="nav-divider" />

          {/* Desktop nav — no inline display so hidden class works */}
          <nav className="hidden md:flex" style={{ gap: 2 }}>
            {nav.map(n => {
              const active = n.href === '/admin' ? path === '/admin' : path.startsWith(n.href)
              return (
                <Link key={n.href} href={n.href} className={`nav-pill${active ? ' is-active' : ''}`}>{n.label}</Link>
              )
            })}
          </nav>

          {/* Mobile: current page pill */}
          <span className="md:hidden nav-pill is-active" style={{ fontSize: 13 }}>{current?.label}</span>

          <div className="nav-divider" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4 }}>
            <Link href="/app" className="nav-pill hidden md:block" style={{ color: 'var(--ink-3)' }}>Pohled zaměstnance</Link>
            <button className="md:hidden nav-pill" onClick={() => setOpen(o => !o)} style={{ padding: '9px 12px', fontSize: 16 }}>☰</button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden" style={{ position: 'fixed', top: 72, left: 12, right: 12, zIndex: 49 }}>
          <div className="glass" style={{ padding: 8, borderRadius: 18 }}>
            {nav.map(n => {
              const active = n.href === '/admin' ? path === '/admin' : path.startsWith(n.href)
              return (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                  className={`nav-pill${active ? ' is-active' : ''}`}
                  style={{ display: 'block', marginBottom: 2 }}>{n.label}</Link>
              )
            })}
            <Link href="/app" onClick={() => setOpen(false)} className="nav-pill" style={{ display: 'block', color: 'var(--ink-3)' }}>Pohled zaměstnance</Link>
          </div>
        </div>
      )}

      <main style={{ paddingTop: 88, paddingBottom: 64, paddingLeft: 16, paddingRight: 16, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
