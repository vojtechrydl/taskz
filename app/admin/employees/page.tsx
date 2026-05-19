'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Employee = { id: string; name: string; email: string | null }
const empty = { name: '', email: '' }

function hueForId(id: string) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h }
function initials(name: string) { return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() }

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => fetch('/api/employees').then(r => r.json()).then(setEmployees).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(empty); setEditing(null); setShowForm(true) }
  const openEdit = (e: Employee) => { setForm({ name: e.name, email: e.email || '' }); setEditing(e.id); setShowForm(true) }
  const cancel = () => { setShowForm(false); setEditing(null); setForm(empty) }

  const save = async () => {
    if (!form.name.trim()) return
    const url = editing ? `/api/employees/${editing}` : '/api/employees'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    cancel(); load()
  }

  const del = async (id: string, name: string) => {
    if (!confirm(`Smazat zaměstnance „${name}"?`)) return
    await fetch(`/api/employees/${id}`, { method: 'DELETE' }); load()
  }

  return (
    <>
    <div className="fade-up">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 32 }}>
        <div>
          <h1 className="page-h1" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 6px', color: 'var(--ink-1)' }}>Zaměstnanci</h1>
          <div style={{ fontSize: 15, color: 'var(--ink-3)' }}>Správa členů týmu · {employees.length} aktivních</div>
        </div>
        <button className="btn btn-accent" onClick={openNew}>+ Nový zaměstnanec</button>
      </div>

      {loading ? <p style={{ color: 'var(--ink-3)' }}>Načítám...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {employees.map(emp => {
            const hue = hueForId(emp.id)
            return (
              <div key={emp.id} className="glass emp-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, transition: 'all 0.22s ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}>
                <div className="emp-avatar" style={{ background: `linear-gradient(135deg, oklch(75% 0.18 ${hue}) 0%, oklch(62% 0.20 ${(hue + 30) % 360}) 100%)` }}>
                  <span style={{ position: 'relative', zIndex: 1 }}>{initials(emp.name)}</span>
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--ink-1)' }}>{emp.name}</div>
                  {emp.email && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{emp.email}</div>}
                </div>

                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 8, paddingTop: 12, borderTop: '1px solid var(--glass-border)', marginTop: 4 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>—</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>aktivní</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>—<small style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-3)', marginLeft: 2 }}>h</small></div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>tento týden</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>—<small style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-3)', marginLeft: 2 }}>h</small></div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>měsíc</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <Link href={`/app?employee=${emp.id}`} className="btn btn-glass btn-sm">Pohled</Link>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(emp)}>Upravit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(emp.id, emp.name)}>Smazat</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>

      {showForm && (
        <div className="modal-overlay" onClick={cancel}>
          <div className="glass-strong" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, borderRadius: 24, display: 'flex', flexDirection: 'column', maxHeight: '85vh', animation: 'modalIn 0.22s ease' }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink-1)' }}>
                {editing ? 'Upravit zaměstnance' : 'Nový zaměstnanec'}
              </h2>
              <button className="icon-btn" onClick={cancel}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label className="label">Jméno *</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Jan Novák" /></div>
              <div><label className="label">E-mail</label><input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jan@firma.cz" /></div>
            </div>
            <div style={{ padding: '16px 24px 20px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={cancel}>Zrušit</button>
              <button className="btn btn-accent" onClick={save}>Uložit</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
