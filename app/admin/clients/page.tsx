'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Client = { id: string; name: string; color: string | null; email: string | null; phone: string | null; notes: string | null; _count: { tasks: number } }

const COLORS = ['#7C3AED','#6366F1','#3B82F6','#06B6D4','#10B981','#F59E0B','#F97316','#F43F5E']
const empty = { name: '', color: COLORS[0], email: '', phone: '', notes: '' }

function hueForId(id: string) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h }

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {COLORS.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: value === c ? `2px solid ${c}` : '2px solid transparent', outlineOffset: 2, transition: 'transform 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
      ))}
    </div>
  )
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => fetch('/api/clients').then(r => r.json()).then(setClients).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(empty); setEditing(null); setShowForm(true) }
  const openEdit = (c: Client) => {
    setForm({ name: c.name, color: c.color || COLORS[0], email: c.email || '', phone: c.phone || '', notes: c.notes || '' })
    setEditing(c.id); setShowForm(true)
  }
  const cancel = () => { setShowForm(false); setEditing(null); setForm(empty) }

  const save = async () => {
    if (!form.name.trim()) return
    const url = editing ? `/api/clients/${editing}` : '/api/clients'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    cancel(); load()
  }

  const del = async (id: string, name: string) => {
    if (!confirm(`Smazat klienta „${name}"?`)) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' }); load()
  }

  return (
    <div className="fade-up">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 32 }}>
        <div>
          <h1 className="page-h1" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 6px', color: 'var(--ink-1)' }}>Klienti</h1>
          <div style={{ fontSize: 15, color: 'var(--ink-3)' }}>Správa klientů · {clients.length} aktivních</div>
        </div>
        <button className="btn btn-accent" onClick={openNew}>+ Nový klient</button>
      </div>

      {loading ? <p style={{ color: 'var(--ink-3)' }}>Načítám...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {clients.map(c => {
            const bg = c.color || `oklch(70% 0.18 ${hueForId(c.id)})`
            return (
              <div key={c.id} className="glass client-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, transition: 'all 0.22s ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="client-swatch" style={{ width: 44, height: 44, background: bg, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em' }}>{c.name}</div>
                    {c.email && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{c._count.tasks}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>úkolů</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
                  <Link href={`/admin/tasks?newFor=${c.id}`} className="btn btn-glass btn-sm">+ Úkol</Link>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Upravit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(c.id, c.name)}>Smazat</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={cancel}>
          <div className="glass-strong modal-box" onClick={e => e.stopPropagation()} style={{ padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 24px', color: 'var(--ink-1)' }}>
              {editing ? 'Upravit klienta' : 'Nový klient'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label className="label">Název *</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Název firmy" /></div>
              <div><label className="label">Barva</label><ColorPicker value={form.color} onChange={c => setForm(p => ({ ...p, color: c }))} /></div>
              <div><label className="label">E-mail</label><input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="kontakt@firma.cz" /></div>
              <div><label className="label">Telefon</label><input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+420 ..." /></div>
              <div><label className="label">Poznámky</label><textarea className="input" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={cancel}>Zrušit</button>
              <button className="btn btn-accent" onClick={save}>Uložit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
