'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type Client = { id: string; name: string }
type Employee = { id: string; name: string }
type Task = {
  id: string
  title: string
  description: string | null
  type: 'ONE_TIME' | 'RECURRING'
  status: 'TODO' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE'
  client: { id: string; name: string; color: string | null }
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

const COLUMNS: { status: Task['status']; label: string; dot: string; dim?: boolean }[] = [
  { status: 'TODO',        label: 'Čeká',     dot: 'bg-[#8B9099]' },
  { status: 'ASSIGNED',    label: 'Zadáno',   dot: 'bg-sky-400' },
  { status: 'IN_PROGRESS', label: 'Probíhá',  dot: 'bg-amber-400' },
  { status: 'DONE',        label: 'Hotovo',   dot: 'bg-emerald-400', dim: true },
]

const STATUS_CLASS: Record<string, string> = {
  TODO:        'bg-[#2A2D30] text-[#8B9099]',
  ASSIGNED:    'bg-sky-500/15 text-sky-400',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400',
  DONE:        'bg-emerald-500/15 text-emerald-400',
}

export default function TasksPage() {
  return <Suspense><TasksPageInner /></Suspense>
}

function TasksPageInner() {
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterType, setFilterType] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const handledNewFor = useRef(false)

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterClient) params.set('clientId', filterClient)
    if (filterEmployee) params.set('employeeId', filterEmployee)
    if (filterType) params.set('type', filterType)
    const [t, c, e] = await Promise.all([
      fetch(`/api/tasks?${params}`).then((r) => r.json()),
      fetch('/api/clients').then((r) => r.json()),
      fetch('/api/employees').then((r) => r.json()),
    ])
    setTasks(t); setClients(c); setEmployees(e)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterClient, filterEmployee, filterType])

  useEffect(() => {
    const newFor = searchParams.get('newFor')
    if (newFor && !handledNewFor.current && clients.length > 0) {
      handledNewFor.current = true
      setForm({ ...emptyForm, clientId: newFor })
      setEditing(null)
      setShowForm(true)
    }
  }, [searchParams, clients])

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
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: status as Task['status'] } : t))
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
  }

  const resetTask = async (id: string) => {
    await fetch(`/api/tasks/${id}/reset`, { method: 'POST' })
    load()
  }

  const onDrop = (status: string) => {
    if (draggedId && draggedId !== status) {
      setStatus(draggedId, status)
    }
    setDraggedId(null)
    setDragOverCol(null)
  }

  const loggedHours = (t: Task) => t.timeEntries.reduce((s, e) => s + e.hours, 0)

  const filteredTasks = tasks.filter(t =>
    (!filterClient || t.client.id === filterClient) &&
    (!filterEmployee || t.employee?.id === filterEmployee) &&
    (!filterType || t.type === filterType)
  )

  const TaskCard = ({ t, mobile = false }: { t: Task; mobile?: boolean }) => {
    const hours = loggedHours(t)
    const overdue = t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date()
    return (
      <div
        className={`card p-3 ${!mobile ? 'cursor-grab active:cursor-grabbing' : ''} ${t.status === 'DONE' ? 'opacity-50' : ''} ${draggedId === t.id ? 'opacity-30' : ''} hover:border-[#3A3D40] transition-colors`}
        draggable={!mobile}
        onDragStart={() => setDraggedId(t.id)}
        onDragEnd={() => { setDraggedId(null); setDragOverCol(null) }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`font-medium text-sm text-[#F0F2F4] leading-snug ${t.status === 'DONE' ? 'line-through text-[#8B9099]' : ''}`}>
            {t.type === 'RECURRING' && <span className="text-[#A78BFA] mr-1">↺</span>}
            {t.title}
          </span>
          {mobile && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${STATUS_CLASS[t.status]}`}>
              {COLUMNS.find(c => c.status === t.status)?.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: t.client.color || '#6B7280' }} />
            <span className="text-xs text-[#8B9099]">{t.client.name}</span>
          </span>
          {t.employee && <span className="text-xs text-[#8B9099]">· {t.employee.name}</span>}
          {t.dueDate && (
            <span className={`text-xs ${overdue ? 'text-red-400' : 'text-[#8B9099]'}`}>
              · {new Date(t.dueDate).toLocaleDateString('cs')}
            </span>
          )}
          {(t.estimatedHours || hours > 0) && (
            <span className="text-xs text-[#8B9099]">· {hours.toFixed(1)}/{t.estimatedHours ?? '?'} hod</span>
          )}
        </div>

        {t.description && (
          <p className="text-xs text-[#8B9099]/60 mb-2 line-clamp-2">{t.description}</p>
        )}

        <div className="flex gap-1 flex-wrap">
          {mobile && t.status !== 'DONE' && COLUMNS.filter(c => c.status !== t.status && c.status !== 'DONE').map(c => (
            <button key={c.status} className="btn-ghost text-xs py-0.5 px-2" onClick={() => setStatus(t.id, c.status)}>
              → {c.label}
            </button>
          ))}
          {mobile && t.status !== 'DONE' && (
            <button className="btn-ghost text-xs py-0.5 px-2 text-emerald-400" onClick={() => setStatus(t.id, 'DONE')}>✓ Hotovo</button>
          )}
          {t.status === 'DONE' && t.type === 'RECURRING' && (
            <button className="btn-ghost text-xs py-0.5 px-2 text-[#A78BFA]" onClick={() => resetTask(t.id)}>↺ Reset</button>
          )}
          <button className="btn-ghost text-xs py-0.5 px-2 ml-auto" onClick={() => openEdit(t)}>Upravit</button>
          <button className="btn-ghost text-xs py-0.5 px-2 text-red-400" onClick={() => del(t.id, t.title)}>Smazat</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white mb-1">Úkoly</h1>
          <p className="text-sm text-[#8B9099]">Správa a sledování úkolů</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nový úkol</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select className="input w-auto text-sm" value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
          <option value="">Všichni klienti</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-auto text-sm" value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
          <option value="">Všichni zaměstnanci</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="input w-auto text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Oba typy</option>
          <option value="ONE_TIME">Jednorázové</option>
          <option value="RECURRING">Pravidelné</option>
        </select>
      </div>

      {loading ? (
        <p className="text-[#8B9099] text-sm">Načítám...</p>
      ) : (
        <>
          {/* DESKTOP: Kanban */}
          <div className="hidden md:grid grid-cols-4 gap-3 flex-1 min-h-0">
            {COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter(t => t.status === col.status)
              const isOver = dragOverCol === col.status
              return (
                <div
                  key={col.status}
                  className="flex flex-col min-h-0"
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.status) }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null) }}
                  onDrop={() => onDrop(col.status)}
                >
                  {/* Column header */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border border-b-0 border-[#2A2D30] bg-[#161819] transition-colors ${isOver ? 'border-[#7C3AED]/50 bg-[#7C3AED]/5' : ''}`}>
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-sm font-medium text-[#F0F2F4]">{col.label}</span>
                    <span className="ml-auto text-xs text-[#8B9099] bg-[#2A2D30] px-1.5 py-0.5 rounded">{colTasks.length}</span>
                  </div>

                  {/* Column body */}
                  <div className={`flex-1 overflow-y-auto p-2 rounded-b-lg border border-[#2A2D30] transition-colors space-y-2 min-h-[200px] ${isOver ? 'border-[#7C3AED]/50 bg-[#7C3AED]/5' : 'bg-[#0D0E0F]'}`}>
                    {colTasks.map(t => <TaskCard key={t.id} t={t} />)}
                    {colTasks.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-xs text-[#8B9099]/40">
                        Přetáhni sem
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* MOBILE: Grouped list */}
          <div className="md:hidden space-y-5">
            {COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter(t => t.status === col.status)
              if (colTasks.length === 0) return null
              return (
                <div key={col.status}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-xs font-semibold text-[#8B9099] uppercase tracking-wide">{col.label}</span>
                    <span className="text-xs text-[#8B9099]/60">{colTasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map(t => <TaskCard key={t.id} t={t} mobile />)}
                  </div>
                </div>
              )
            })}
            {filteredTasks.length === 0 && (
              <div className="card p-12 text-center text-[#8B9099] text-sm">Žádné úkoly.</div>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-base font-semibold text-white mb-4">{editing ? 'Upravit úkol' : 'Nový úkol'}</h2>
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
    </div>
  )
}
