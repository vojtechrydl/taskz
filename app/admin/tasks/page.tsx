'use client'
import { useEffect, useState } from 'react'

type Client = { id: string; name: string }
type Employee = { id: string; name: string }
type Task = {
  id: string
  title: string
  description: string | null
  type: 'ONE_TIME' | 'RECURRING'
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  client: { id: string; name: string }
  employee: { id: string; name: string } | null
  estimatedHours: number | null
  dueDate: string | null
  completedAt: string | null
  timeEntries: { hours: number }[]
}

const emptyForm = {
  title: '', description: '', type: 'ONE_TIME' as 'ONE_TIME' | 'RECURRING',
  clientId: '', employeeId: '', estimatedHours: '', dueDate: '',
}

const STATUS_LABEL: Record<string, string> = { TODO: 'Čeká', IN_PROGRESS: 'Probíhá', DONE: 'Splněno' }
const STATUS_CLASS: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  DONE: 'bg-green-100 text-green-700',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterClient) params.set('clientId', filterClient)
    if (filterEmployee) params.set('employeeId', filterEmployee)
    if (filterStatus) params.set('status', filterStatus)
    if (filterType) params.set('type', filterType)
    const [t, c, e] = await Promise.all([
      fetch(`/api/tasks?${params}`).then((r) => r.json()),
      fetch('/api/clients').then((r) => r.json()),
      fetch('/api/employees').then((r) => r.json()),
    ])
    setTasks(t); setClients(c); setEmployees(e)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterClient, filterEmployee, filterStatus, filterType])

  const openNew = () => { setForm(emptyForm); setEditing(null); setShowForm(true) }
  const openEdit = (t: Task) => {
    setForm({
      title: t.title, description: t.description || '', type: t.type,
      clientId: t.client.id, employeeId: t.employee?.id || '',
      estimatedHours: t.estimatedHours?.toString() || '',
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '',
    })
    setEditing(t.id); setShowForm(true)
  }
  const cancel = () => { setShowForm(false); setEditing(null); setForm(emptyForm) }

  const save = async () => {
    if (!form.title.trim() || !form.clientId) return
    const url = editing ? `/api/tasks/${editing}` : '/api/tasks'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    cancel(); load()
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`Smazat úkol „${title}"?`)) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    load()
  }

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    load()
  }

  const resetTask = async (id: string) => {
    await fetch(`/api/tasks/${id}/reset`, { method: 'POST' })
    load()
  }

  const loggedHours = (t: Task) => t.timeEntries.reduce((s, e) => s + e.hours, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Úkoly</h1>
        <button className="btn-primary" onClick={openNew}>+ Nový úkol</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select className="input w-auto" value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
          <option value="">Všichni klienti</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-auto" value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
          <option value="">Všichni zaměstnanci</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="input w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Všechny stavy</option>
          <option value="TODO">Čeká</option>
          <option value="IN_PROGRESS">Probíhá</option>
          <option value="DONE">Splněno</option>
        </select>
        <select className="input w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Oba typy</option>
          <option value="ONE_TIME">Jednorázové</option>
          <option value="RECURRING">Pravidelné</option>
        </select>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Upravit úkol' : 'Nový úkol'}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Název *</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Název úkolu" />
              </div>
              <div>
                <label className="label">Popis</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Klient *</label>
                  <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                    <option value="">Vyberte klienta</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Zaměstnanec</label>
                  <select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                    <option value="">Nepřiřazeno</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Typ</label>
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'ONE_TIME' | 'RECURRING' })}>
                    <option value="ONE_TIME">Jednorázový</option>
                    <option value="RECURRING">Pravidelný</option>
                  </select>
                </div>
                <div>
                  <label className="label">Termín</label>
                  <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Odhadovaný čas (hod)</label>
                <input className="input" type="number" min="0" step="0.5" value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} placeholder="0" />
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
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">Žádné úkoly.</div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const hours = loggedHours(t)
            const overdue = t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date()
            return (
              <div key={t.id} className={`card px-4 py-3 flex items-start gap-3 ${t.status === 'DONE' ? 'opacity-60' : ''}`}>
                {/* Type indicator */}
                <div className="mt-0.5 shrink-0">
                  {t.type === 'RECURRING' ? (
                    <span title="Pravidelný úkol" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">↺</span>
                  ) : (
                    <span title="Jednorázový úkol" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs">1×</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{t.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    {overdue && <span className="text-xs text-red-600 font-medium">Po termínu</span>}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-3">
                    <span className="font-medium text-gray-700">{t.client.name}</span>
                    {t.employee && <span>{t.employee.name}</span>}
                    {t.dueDate && <span className={overdue ? 'text-red-500' : ''}>{new Date(t.dueDate).toLocaleDateString('cs')}</span>}
                    <span>{hours.toFixed(1)} / {t.estimatedHours ?? '?'} hod</span>
                  </div>
                  {t.description && <div className="text-sm text-gray-400 mt-0.5 truncate">{t.description}</div>}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {t.status !== 'DONE' && (
                    <>
                      {t.status === 'TODO' && (
                        <button className="btn-ghost text-xs" onClick={() => setStatus(t.id, 'IN_PROGRESS')}>Zahájit</button>
                      )}
                      <button className="btn-ghost text-xs text-green-700" onClick={() => setStatus(t.id, 'DONE')}>✓ Splněno</button>
                    </>
                  )}
                  {t.status === 'DONE' && t.type === 'RECURRING' && (
                    <button className="btn-ghost text-xs text-blue-600" onClick={() => resetTask(t.id)}>↺ Reset</button>
                  )}
                  <button className="btn-secondary text-xs" onClick={() => openEdit(t)}>Upravit</button>
                  <button className="btn-danger text-xs" onClick={() => del(t.id, t.title)}>Smazat</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
