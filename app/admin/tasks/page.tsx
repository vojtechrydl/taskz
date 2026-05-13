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
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const handledNewFor = useRef(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

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
    const dueDate = dateInputRef.current?.value || null
    const payload = {
      ...form,
      dueDate,
      estimatedHours: form.estimatedHours !== '' ? form.estimatedHours : null,
    }
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
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

  const COL_STATUSES = COLUMNS.map(c => c.status)

  const moveCard = (taskId: string, direction: 'left' | 'right') => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const idx = COL_STATUSES.indexOf(task.status)
    const next = direction === 'right' ? COL_STATUSES[idx + 1] : COL_STATUSES[idx - 1]
    if (next) setStatus(taskId, next)
  }

  const loggedHours = (t: Task) => t.timeEntries.reduce((s, e) => s + e.hours, 0)
  const fmtHours = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(1)

  const dueDateClass = (dueDate: string, status: string) => {
    if (status === 'DONE') return 'text-[#8B9099]'
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
    if (due <= today) return 'text-red-400'
    if (due.getTime() === tomorrow.getTime()) return 'text-amber-400'
    return 'text-emerald-400'
  }

  const filteredTasks = tasks.filter(t =>
    (!filterClient || t.client.id === filterClient) &&
    (!filterEmployee || t.employee?.id === filterEmployee) &&
    (!filterType || t.type === filterType)
  )

  const TaskCard = ({ t, mobile = false }: { t: Task; mobile?: boolean }) => {
    const hours = loggedHours(t)
    const idx = COL_STATUSES.indexOf(t.status)
    return (
      <div
        className={`bg-[#1E2022] rounded-lg border border-[#2A2D30] shadow-sm p-3 ${!mobile ? 'cursor-grab active:cursor-grabbing' : ''} ${t.status === 'DONE' ? 'opacity-50' : ''} hover:border-[#3A3D40] hover:shadow-md transition-all`}
        draggable={!mobile}
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move' }}
        onDragEnd={() => setDragOverCol(null)}
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

        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: t.client.color || '#6B7280' }} />
            <span className="text-xs text-[#8B9099]">{t.client.name}</span>
          </span>
          {t.employee && <span className="text-xs text-[#8B9099]">· {t.employee.name}</span>}
          {t.dueDate && (
            <span className={`text-xs font-medium ${dueDateClass(t.dueDate, t.status)}`}>
              · {new Date(t.dueDate).toLocaleDateString('cs')}
            </span>
          )}
        </div>
        {(t.estimatedHours != null || hours > 0) && (
          <div className="text-xs text-[#8B9099] mb-2">
            {fmtHours(hours)}{t.estimatedHours != null ? `/${fmtHours(t.estimatedHours)}` : ''} hod
          </div>
        )}

        {t.description && (
          <p className="text-xs text-[#8B9099]/60 mb-2 line-clamp-2">{t.description}</p>
        )}

        <div className="flex gap-1 flex-wrap items-center">
          {idx > 0 && (
            <button className="btn-ghost text-xs py-0.5 px-2" onClick={() => moveCard(t.id, 'left')}>
              {mobile ? '↑' : '←'}
            </button>
          )}
          {idx < COL_STATUSES.length - 1 && (
            <button className="btn-ghost text-xs py-0.5 px-2" onClick={() => moveCard(t.id, 'right')}>
              {mobile ? '↓' : '→'}
            </button>
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
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(col.status) }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null) }}
                  onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) setStatus(id, col.status); setDragOverCol(null) }}
                >
                  {/* Column header */}
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-lg border border-b-0 transition-colors ${isOver ? 'border-[#7C3AED]/50 bg-[#7C3AED]/10' : 'border-[#2A2D30] bg-[#161819]'}`}>
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-sm font-semibold text-[#F0F2F4]">{col.label}</span>
                    <span className="ml-auto text-xs text-[#8B9099] bg-[#0D0E0F] px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>

                  {/* Column body */}
                  <div className={`flex-1 overflow-y-auto p-2 rounded-b-lg border border-[#2A2D30] transition-colors space-y-2 min-h-[200px] ${isOver ? 'border-[#7C3AED]/50 bg-[#7C3AED]/5' : 'bg-[#111214]'}`}>
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
                <input className="input" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Název úkolu" />
              </div>
              <div>
                <label className="label">Popis</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Klient *</label>
                  <select className="input" value={form.clientId} onChange={(e) => setForm(p => ({ ...p, clientId: e.target.value }))}>
                    <option value="">Vyberte klienta</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Zaměstnanec</label>
                  <select className="input" value={form.employeeId} onChange={(e) => setForm(p => ({ ...p, employeeId: e.target.value }))}>
                    <option value="">Nepřiřazeno</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Typ</label>
                  <select className="input" value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value as 'ONE_TIME' | 'RECURRING' }))}>
                    <option value="ONE_TIME">Jednorázový</option>
                    <option value="RECURRING">Pravidelný</option>
                  </select>
                </div>
                <div>
                  <label className="label">Termín</label>
                  <input
                    ref={dateInputRef}
                    className="input"
                    type="date"
                    key={editing ?? 'new'}
                    defaultValue={form.dueDate}
                  />
                </div>
              </div>
              <div>
                <label className="label">Odhadovaný čas (hod)</label>
                <input className="input" type="number" min="0" step="0.5" value={form.estimatedHours} onChange={(e) => setForm(p => ({ ...p, estimatedHours: e.target.value }))} placeholder="0" />
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
