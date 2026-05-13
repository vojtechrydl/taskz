'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Client = {
  id: string
  name: string
  color: string | null
  email: string | null
  phone: string | null
  notes: string | null
  _count: { tasks: number }
}

const COLORS = [
  '#7C3AED', '#6366F1', '#3B82F6', '#06B6D4',
  '#10B981', '#F59E0B', '#F97316', '#F43F5E',
]

const empty = { name: '', color: COLORS[0], email: '', phone: '', notes: '' }

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full transition-transform hover:scale-110 ring-offset-[#161819]"
          style={{
            backgroundColor: c,
            outline: value === c ? `2px solid ${c}` : '2px solid transparent',
            outlineOffset: '2px',
          }}
        />
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

  const load = () =>
    fetch('/api/clients')
      .then((r) => r.json())
      .then(setClients)
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openNew = () => { setForm(empty); setEditing(null); setShowForm(true) }
  const openEdit = (c: Client) => {
    setForm({ name: c.name, color: c.color || COLORS[0], email: c.email || '', phone: c.phone || '', notes: c.notes || '' })
    setEditing(c.id)
    setShowForm(true)
  }
  const cancel = () => { setShowForm(false); setEditing(null); setForm(empty) }

  const save = async () => {
    if (!form.name.trim()) return
    const url = editing ? `/api/clients/${editing}` : '/api/clients'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    cancel()
    load()
  }

  const del = async (id: string, name: string) => {
    if (!confirm(`Smazat klienta „${name}"? Smažou se i všechny jeho úkoly.`)) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white mb-1">Klienti</h1>
          <p className="text-sm text-[#8B9099]">Správa klientů</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nový klient</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-white mb-4">
              {editing ? 'Upravit klienta' : 'Nový klient'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="label">Název *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Název firmy nebo jméno" />
              </div>
              <div>
                <label className="label">Barva</label>
                <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="kontakt@firma.cz" />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+420 ..." />
              </div>
              <div>
                <label className="label">Poznámky</label>
                <textarea className="input resize-none" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn-secondary" onClick={cancel}>Zrušit</button>
              <button className="btn-primary" onClick={save}>Uložit</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[#8B9099] text-sm">Načítám...</p>
      ) : clients.length === 0 ? (
        <div className="card p-12 text-center text-[#8B9099] text-sm">Zatím žádní klienti. Přidejte prvního.</div>
      ) : (
        <div className="card divide-y divide-[#2A2D30]">
          {clients.map((c) => (
            <div key={c.id} className="flex items-start px-4 py-4 gap-3">
              <div
                className="w-3 h-3 rounded-sm shrink-0 mt-1"
                style={{ backgroundColor: c.color || '#6B7280' }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#F0F2F4] text-sm">{c.name}</div>
                <div className="text-xs text-[#8B9099] flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {c.email && <span className="truncate max-w-[180px]">{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                  <span>{c._count.tasks} úkolů</span>
                </div>
                {c.notes && <div className="text-xs text-[#8B9099]/60 mt-0.5 truncate">{c.notes}</div>}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Link href={`/admin/tasks?newFor=${c.id}`} className="btn btn-secondary text-xs">+ Úkol</Link>
                  <button className="btn-secondary text-xs" onClick={() => openEdit(c)}>Upravit</button>
                  <button className="btn-danger text-xs" onClick={() => del(c.id, c.name)}>Smazat</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
