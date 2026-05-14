'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type Client = { id: string; name: string }
type Employee = { id: string; name: string }
type Task = {
  id: string; title: string; description: string | null
  type: 'ONE_TIME' | 'RECURRING'
  status: 'TODO' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE'
  client: { id: string; name: string; color: string | null }
  employee: { id: string; name: string } | null
  estimatedHours: number | null; dueDate: string | null; completedAt: string | null
  timeEntries: { hours: number }[]
}

const emptyForm = { title: '', description: '', type: 'ONE_TIME' as 'ONE_TIME' | 'RECURRING', clientId: '', employeeId: '', estimatedHours: '', dueDate: '' }

const COLS = [
  { id: 'TODO',        label: 'Čeká',    colClass: 'kcol--wait',  dotClass: 'status-dot--wait' },
  { id: 'ASSIGNED',   label: 'Zadáno',  colClass: 'kcol--todo',  dotClass: 'status-dot--todo' },
  { id: 'IN_PROGRESS',label: 'Probíhá', colClass: 'kcol--doing', dotClass: 'status-dot--doing' },
  { id: 'DONE',       label: 'Hotovo',  colClass: 'kcol--done',  dotClass: 'status-dot--done' },
] as const

function fmtHours(n: number) { return n % 1 === 0 ? n.toString() : n.toFixed(1) }
function hueForId(id: string) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h }
function initials(name: string) { return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() }

function dueDateColor(dueDate: string, status: string) {
  if (status === 'DONE') return 'var(--ink-4)'
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const due = new Date(dueDate); due.setHours(0,0,0,0)
  if (due <= today) return 'oklch(60% 0.18 25)'
  if (due.getTime() === tomorrow.getTime()) return 'oklch(70% 0.16 70)'
  return 'oklch(55% 0.16 150)'
}

export default function TasksPage() {
  return <Suspense><TasksPageInner /></Suspense>
}

function TasksPageInner() {
  const searchParams = useSearchParams()
  const [tasks, setTasks]     = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm]       = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [dragOver, setDragOver] = useState<string | null>(null)
  const handledNewFor = useRef(false)
  const dateRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterClient) params.set('clientId', filterClient)
    if (filterEmployee) params.set('employeeId', filterEmployee)
    const [t, c, e] = await Promise.all([
      fetch(`/api/tasks?${params}`).then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ])
    setTasks(t); setClients(c); setEmployees(e); setLoading(false)
  }

  useEffect(() => { load() }, [filterClient, filterEmployee])

  useEffect(() => {
    const newFor = searchParams.get('newFor')
    if (newFor && !handledNewFor.current && clients.length > 0) {
      handledNewFor.current = true
      setForm({ ...emptyForm, clientId: newFor }); setEditing(null); setShowForm(true)
    }
  }, [searchParams, clients])

  const openNew = () => { setForm(emptyForm); setEditing(null); setShowForm(true) }
  const openEdit = (t: Task) => {
    setForm({ title: t.title, description: t.description || '', type: t.type, clientId: t.client.id, employeeId: t.employee?.id || '', estimatedHours: t.estimatedHours?.toString() || '', dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '' })
    setEditing(t.id); setShowForm(true)
  }
  const cancel = () => { setShowForm(false); setEditing(null); setForm(emptyForm) }

  const save = async () => {
    if (!form.title.trim() || !form.clientId) return
    const url = editing ? `/api/tasks/${editing}` : '/api/tasks'
    const method = editing ? 'PATCH' : 'POST'
    const payload = { ...form, dueDate: dateRef.current?.value || null, estimatedHours: form.estimatedHours !== '' ? form.estimatedHours : null }
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    cancel(); load()
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`Smazat úkol „${title}"?`)) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' }); load()
  }

  const setStatus = async (id: string, status: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: status as Task['status'] } : t))
    await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
  }

  const moveCard = (taskId: string, dir: 'left' | 'right') => {
    const task = tasks.find(t => t.id === taskId); if (!task) return
    const colIds = COLS.map(c => c.id)
    const idx = colIds.indexOf(task.status)
    const next = dir === 'right' ? colIds[idx + 1] : colIds[idx - 1]
    if (next) setStatus(taskId, next)
  }

  const resetTask = async (id: string) => { await fetch(`/api/tasks/${id}/reset`, { method: 'POST' }); load() }

  const filtered = tasks.filter(t =>
    (!filterClient || t.client.id === filterClient) &&
    (!filterEmployee || t.employee?.id === filterEmployee)
  )

  const totalLogged = filtered.reduce((s, t) => s + t.timeEntries.reduce((ss, e) => ss + e.hours, 0), 0)
  const totalEst = filtered.reduce((s, t) => s + (t.estimatedHours || 0), 0)

  return (
    <div className="fade-up">
      {/* Head */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 6px', color: 'var(--ink-1)' }}>Úkoly</h1>
          <div style={{ fontSize: 15, color: 'var(--ink-3)' }}>Správa a sledování úkolů · {filtered.length} celkem · {fmtHours(totalLogged)}/{fmtHours(totalEst)}h</div>
        </div>
        <button className="btn btn-accent" onClick={openNew}>+ Nový úkol</button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="field-pill" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="">Klient · Všichni</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="field-pill" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
          <option value="">Tým · Všichni</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {loading ? <p style={{ color: 'var(--ink-3)' }}>Načítám...</p> : (
        <>
          {/* Desktop kanban */}
          <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, alignItems: 'start' }}>
            {COLS.map(col => {
              const colTasks = filtered.filter(t => t.status === col.id)
              const isOver = dragOver === col.id
              return (
                <div key={col.id} className={`kcol ${col.colClass} ${isOver ? 'is-dragover' : ''}`}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(col.id) }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
                  onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) setStatus(id, col.id); setDragOver(null) }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 12px' }}>
                    <span className={`status-dot ${col.dotClass}`} />
                    <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink-1)' }}>{col.label}</span>
                    <div style={{ flex: 1 }} />
                    <span className="pill-count">{colTasks.length}</span>
                  </div>
                  {colTasks.length === 0 ? (
                    <div className="empty-col">Přetáhni sem</div>
                  ) : colTasks.map(t => <TaskCard key={t.id} t={t} colIdx={COLS.findIndex(c => c.id === t.status)} onEdit={openEdit} onDel={del} onMove={moveCard} onReset={resetTask} />)}
                </div>
              )
            })}
          </div>

          {/* Mobile grouped list */}
          <div className="md:hidden" style={{ flexDirection: 'column', gap: 20 }}>
            {COLS.map(col => {
              const colTasks = filtered.filter(t => t.status === col.id)
              if (!colTasks.length) return null
              return (
                <div key={col.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span className={`status-dot ${col.dotClass}`} />
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>{col.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{colTasks.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {colTasks.map(t => <TaskCard key={t.id} t={t} colIdx={COLS.findIndex(c => c.id === t.status)} mobile onEdit={openEdit} onDel={del} onMove={moveCard} onReset={resetTask} />)}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={cancel}>
          <div className="glass-strong modal-box" onClick={e => e.stopPropagation()} style={{ padding: 32, maxWidth: 520 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 24px', color: 'var(--ink-1)' }}>{editing ? 'Upravit úkol' : 'Nový úkol'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="label">Název *</label><input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Název úkolu" /></div>
              <div><label className="label">Popis</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Klient *</label>
                  <select className="input" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                    <option value="">Vyberte klienta</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div><label className="label">Zaměstnanec</label>
                  <select className="input" value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}>
                    <option value="">Nepřiřazeno</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Typ</label>
                  <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as 'ONE_TIME' | 'RECURRING' }))}>
                    <option value="ONE_TIME">Jednorázový</option>
                    <option value="RECURRING">Pravidelný</option>
                  </select></div>
                <div><label className="label">Termín</label>
                  <input ref={dateRef} className="input" type="date" key={editing ?? 'new'} defaultValue={form.dueDate} /></div>
              </div>
              <div><label className="label">Odhadovaný čas (hod)</label><input className="input" type="number" min="0" step="0.5" value={form.estimatedHours} onChange={e => setForm(p => ({ ...p, estimatedHours: e.target.value }))} placeholder="0" /></div>
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

function TaskCard({ t, colIdx, mobile = false, onEdit, onDel, onMove, onReset }: {
  t: Task; colIdx: number; mobile?: boolean
  onEdit: (t: Task) => void; onDel: (id: string, title: string) => void
  onMove: (id: string, dir: 'left' | 'right') => void; onReset: (id: string) => void
}) {
  const logged = t.timeEntries.reduce((s, e) => s + e.hours, 0)
  const pct = t.estimatedHours ? Math.min(logged / t.estimatedHours, 1) : 0
  const over = t.estimatedHours ? logged > t.estimatedHours : false
  const overdue = t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date()

  return (
    <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, opacity: t.status === 'DONE' ? 0.6 : 1 }}
      draggable={!mobile}
      onDragStart={e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move' }}
      onDragEnd={() => {}}>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3, color: 'var(--ink-1)', textDecoration: t.status === 'DONE' ? 'line-through' : 'none' }}>
        {t.type === 'RECURRING' && <span style={{ color: 'var(--accent)', marginRight: 4 }}>↺</span>}
        {t.title}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--ink-3)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: t.client.color || `oklch(70% 0.18 ${hueForId(t.client.id)})`, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{t.client.name}</span>
        </span>
        {t.employee && (
          <>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="avatar" style={{ width: 18, height: 18, fontSize: 9, background: `oklch(70% 0.16 ${hueForId(t.employee.id)})` }}>
                {initials(t.employee.name)}
              </span>
              <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{t.employee.name.split(' ')[0]}</span>
            </span>
          </>
        )}
        {t.dueDate && (
          <>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span style={{ color: dueDateColor(t.dueDate, t.status), fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
              📅 {new Date(t.dueDate).toLocaleDateString('cs')}
            </span>
          </>
        )}
        {overdue && <span style={{ color: 'oklch(60% 0.18 25)', fontWeight: 600 }}>Po termínu</span>}
      </div>

      {t.estimatedHours != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {fmtHours(logged)}/{fmtHours(t.estimatedHours)}h
          </span>
          <div className={`progress-bar${over ? ' over' : ''}`}>
            <i style={{ width: `${pct * 100}%` }} />
          </div>
        </div>
      )}

      {t.description && (
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {t.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8, borderTop: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {colIdx > 0 && <button className="icon-btn" onClick={() => onMove(t.id, 'left')} title="←">{mobile ? '↑' : '←'}</button>}
          {colIdx < 3 && <button className="icon-btn" onClick={() => onMove(t.id, 'right')} title="→">{mobile ? '↓' : '→'}</button>}
          {t.status === 'DONE' && t.type === 'RECURRING' && <button className="icon-btn" onClick={() => onReset(t.id)} title="Reset" style={{ color: 'var(--accent)' }}>↺</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(t)}>Upravit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDel(t.id, t.title)}>Smazat</button>
        </div>
      </div>
    </div>
  )
}
