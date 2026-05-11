'use client'
import { useEffect, useState } from 'react'

type Employee = { id: string; name: string; email: string | null }
const empty = { name: '', email: '' }

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () =>
    fetch('/api/employees')
      .then((r) => r.json())
      .then(setEmployees)
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openNew = () => { setForm(empty); setEditing(null); setShowForm(true) }
  const openEdit = (e: Employee) => {
    setForm({ name: e.name, email: e.email || '' })
    setEditing(e.id)
    setShowForm(true)
  }
  const cancel = () => { setShowForm(false); setEditing(null); setForm(empty) }

  const save = async () => {
    if (!form.name.trim()) return
    const url = editing ? `/api/employees/${editing}` : '/api/employees'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    cancel()
    load()
  }

  const del = async (id: string, name: string) => {
    if (!confirm(`Smazat zaměstnance „${name}"?`)) return
    await fetch(`/api/employees/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zaměstnanci</h1>
        <button className="btn-primary" onClick={openNew}>+ Nový zaměstnanec</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Upravit zaměstnance' : 'Nový zaměstnanec'}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Jméno *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jan Novák" />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jan@firma.cz" />
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
        <p className="text-gray-500">Načítám...</p>
      ) : employees.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">Zatím žádní zaměstnanci.</div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {employees.map((e) => (
            <div key={e.id} className="flex items-center px-5 py-4 gap-4">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-sm shrink-0">
                {e.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{e.name}</div>
                {e.email && <div className="text-sm text-gray-500">{e.email}</div>}
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => openEdit(e)}>Upravit</button>
                <button className="btn-danger" onClick={() => del(e.id, e.name)}>Smazat</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
