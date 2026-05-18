'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type Client = { id: string; name: string }
type Employee = { id: string; name: string }
type Comment = { id: string; text: string; createdAt: string; employee: { id: string; name: string } }
type Task = {
  id: string; title: string; description: string | null
  type: 'ONE_TIME' | 'RECURRING'
  status: 'TODO' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE'
  client: { id: string; name: string; color: string | null }
  employee: { id: string; name: string } | null
  estimatedHours: number | null; dueDate: string | null; completedAt: string | null
  position: number
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
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ taskId: string; pos: 'before' | 'after' } | null>(null)
  const dropTargetRef = useRef<{ taskId: string; pos: 'before' | 'after' } | null>(null)
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const dateRef = useRef<HTMLInputElement>(null)
  const handledNewFor = useRef(false)


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

  const openNew = () => {
    setForm(emptyForm); setDueDate(''); setEditing(null); setShowForm(true)
  }
  const openEdit = (t: Task) => {
    const date = t.dueDate ? t.dueDate.slice(0, 10) : ''
    setForm({ title: t.title, description: t.description || '', type: t.type, clientId: t.client.id, employeeId: t.employee?.id || '', estimatedHours: t.estimatedHours?.toString() || '', dueDate: '' })
    setDueDate(date); setEditing(t.id); setShowForm(true)
  }
  const cancel = () => { setShowForm(false); setEditing(null); setForm(emptyForm); setDueDate('') }

  const save = async () => {
    if (!form.title.trim() || !form.clientId || saving) return
    setSaving(true)
    try {
      const url = editing ? `/api/tasks/${editing}` : '/api/tasks'
      const method = editing ? 'PATCH' : 'POST'
      const finalDueDate = dateRef.current?.value || null
      const payload = { ...form, dueDate: finalDueDate, estimatedHours: form.estimatedHours !== '' ? form.estimatedHours : null }
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      cancel(); load()
    } finally {
      setSaving(false)
    }
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

  const openDetail = async (t: Task) => {
    setDetailTask(t)
    const data = await fetch(`/api/tasks/${t.id}/comments`).then(r => r.json())
    setComments(data)
  }

  const reorderDrop = async (dragId: string, targetColId: string) => {
    const allTasks = tasksRef.current
    const dt = dropTargetRef.current

    const colTasks = allTasks
      .filter(t => t.status === targetColId &&
        (!filterClient || t.client.id === filterClient) &&
        (!filterEmployee || t.employee?.id === filterEmployee))
      .sort((a, b) => {
        const pd = (a.position || 0) - (b.position || 0)
        return pd !== 0 ? pd : a.id.localeCompare(b.id)
      })

    const draggedTask = allTasks.find(t => t.id === dragId)
    if (!draggedTask) return

    const withoutDragged = colTasks.filter(t => t.id !== dragId)
    let insertIdx = withoutDragged.length
    if (dt) {
      const targetIdx = withoutDragged.findIndex(t => t.id === dt.taskId)
      if (targetIdx >= 0) insertIdx = dt.pos === 'before' ? targetIdx : targetIdx + 1
    }

    const newColTasks = [...withoutDragged]
    newColTasks.splice(insertIdx, 0, draggedTask)

    const updates: { id: string; status: string; position: number }[] = []
    newColTasks.forEach((t, i) => updates.push({ id: t.id, status: targetColId, position: (i + 1) * 1000 }))

    if (draggedTask.status !== targetColId) {
      allTasks
        .filter(t => t.status === draggedTask.status && t.id !== dragId)
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .forEach((t, i) => updates.push({ id: t.id, status: t.status, position: (i + 1) * 1000 }))
    }

    dropTargetRef.current = null
    setDropTarget(null); setDraggedId(null); setDragOver(null)

    setTasks(prev => prev.map(t => {
      const u = updates.find(u => u.id === t.id)
      return u ? { ...t, status: u.status as Task['status'], position: u.position } : t
    }))

    await fetch('/api/tasks/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }

  const filtered = tasks.filter(t =>
    (!filterClient || t.client.id === filterClient) &&
    (!filterEmployee || t.employee?.id === filterEmployee)
  )

  const totalLogged = filtered.reduce((s, t) => s + t.timeEntries.reduce((ss, e) => ss + e.hours, 0), 0)
  const totalEst = filtered.reduce((s, t) => s + (t.estimatedHours || 0), 0)

  return (
    <div className="fade-up">
      {/* Head */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28 }}>
        <div>
          <h1 className="page-h1" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 6px', color: 'var(--ink-1)' }}>Úkoly</h1>
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
              const colTasks = filtered.filter(t => t.status === col.id).sort((a, b) => (a.position || 0) - (b.position || 0))
              const isOver = dragOver === col.id
              return (
                <div key={col.id} className={`kcol ${col.colClass} ${isOver ? 'is-dragover' : ''}`}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(col.id) }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setDragOver(null) } }}
                  onDrop={e => { e.preventDefault(); dropTargetRef.current = null; const id = e.dataTransfer.getData('text/plain'); if (id) reorderDrop(id, col.id) }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 12px' }}>
                    <span className={`status-dot ${col.dotClass}`} />
                    <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink-1)' }}>{col.label}</span>
                    <div style={{ flex: 1 }} />
                    <span className="pill-count">{colTasks.length}</span>
                  </div>
                  {colTasks.length === 0 ? (
                    <div className="empty-col">Přetáhni sem</div>
                  ) : colTasks.map(t => (
                    <div key={t.id}>
                      {dropTarget?.taskId === t.id && dropTarget.pos === 'before' && (
                        <div style={{ height: 3, background: 'var(--accent)', borderRadius: 2, margin: '0 4px 6px' }} />
                      )}
                      <div
                        onDragOver={e => {
                          e.preventDefault()
                          const rect = e.currentTarget.getBoundingClientRect()
                          const pos: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
                          const next = { taskId: t.id, pos }
                          dropTargetRef.current = next
                          setDropTarget(next)
                        }}
                        onDrop={e => {
                          e.preventDefault(); e.stopPropagation()
                          const id = e.dataTransfer.getData('text/plain')
                          if (id) reorderDrop(id, col.id)
                        }}
                      >
                        <TaskCard t={t} colIdx={COLS.findIndex(c => c.id === t.status)} onEdit={openEdit} onDel={del} onMove={moveCard} onReset={resetTask} onDetail={openDetail} draggedId={draggedId} onDragStart={setDraggedId} onDragEnd={() => { setDraggedId(null); setDropTarget(null) }} />
                      </div>
                      {dropTarget?.taskId === t.id && dropTarget.pos === 'after' && (
                        <div style={{ height: 3, background: 'var(--accent)', borderRadius: 2, margin: '6px 4px 0' }} />
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Mobile grouped list */}
          <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {COLS.map(col => {
              const colTasks = filtered.filter(t => t.status === col.id).sort((a, b) => (a.position || 0) - (b.position || 0))
              if (!colTasks.length) return null
              return (
                <div key={col.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span className={`status-dot ${col.dotClass}`} />
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>{col.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{colTasks.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {colTasks.map(t => <TaskCard key={t.id} t={t} colIdx={COLS.findIndex(c => c.id === t.status)} mobile onEdit={openEdit} onDel={del} onMove={moveCard} onReset={resetTask} onDetail={openDetail} />)}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Detail modal */}
      {detailTask && (
        <div className="modal-overlay" onClick={() => setDetailTask(null)}>
          <div className="glass-strong" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, borderRadius: 24, display: 'flex', flexDirection: 'column', maxHeight: '85vh', animation: 'modalIn 0.22s ease' }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 6px', color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>{detailTask.title}</h2>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: detailTask.client.color || 'var(--ink-4)', display: 'inline-block' }} />
                      {detailTask.client.name}
                    </span>
                    {detailTask.employee && <span>· {detailTask.employee.name}</span>}
                    {detailTask.dueDate && <span>· {new Date(detailTask.dueDate).toLocaleDateString('cs')}</span>}
                  </div>
                </div>
                <button className="icon-btn" onClick={() => setDetailTask(null)}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {detailTask.description ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 8 }}>Popis</div>
                  <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detailTask.description}</div>
                </div>
              ) : <p style={{ color: 'var(--ink-4)', fontStyle: 'italic', fontSize: 14 }}>Bez popisu.</p>}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 12 }}>Komentáře {comments.length > 0 && `(${comments.length})`}</div>
                {comments.length === 0 ? <p style={{ color: 'var(--ink-4)', fontStyle: 'italic', fontSize: 14 }}>Zatím žádné komentáře.</p> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {comments.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                        <div className="avatar" style={{ background: `oklch(70% 0.16 ${hueForId(c.employee.id)})`, flexShrink: 0 }}>{initials(c.employee.name)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'baseline' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{c.employee.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{new Date(c.createdAt).toLocaleString('cs', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={cancel}>
          <div className="glass-strong modal-box" onClick={e => e.stopPropagation()} style={{ padding: 32, maxWidth: 520 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 24px', color: 'var(--ink-1)' }}>{editing ? 'Upravit úkol' : 'Nový úkol'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="label">Název *</label><input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Název úkolu" /></div>
              <div><label className="label">Popis</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
              <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Typ</label>
                  <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as 'ONE_TIME' | 'RECURRING' }))}>
                    <option value="ONE_TIME">Jednorázový</option>
                    <option value="RECURRING">Pravidelný</option>
                  </select></div>
                <div>
                  <label className="label">Termín</label>
                  <input
                    ref={dateRef}
                    className="input"
                    type="date"
                    key={editing ?? 'new'}
                    defaultValue={dueDate || new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>
              <div><label className="label">Odhadovaný čas (hod)</label><input className="input" type="number" min="0" step="0.5" value={form.estimatedHours} onChange={e => setForm(p => ({ ...p, estimatedHours: e.target.value }))} placeholder="0" /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={cancel}>Zrušit</button>
              <button className="btn btn-accent" onClick={save} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Ukládám…' : 'Uložit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskCard({ t, colIdx, mobile = false, onEdit, onDel, onMove, onReset, onDetail, draggedId, onDragStart, onDragEnd }: {
  t: Task; colIdx: number; mobile?: boolean
  onEdit: (t: Task) => void; onDel: (id: string, title: string) => void
  onMove: (id: string, dir: 'left' | 'right') => void; onReset: (id: string) => void
  onDetail?: (t: Task) => void
  draggedId?: string | null; onDragStart?: (id: string) => void; onDragEnd?: () => void
}) {
  const logged = t.timeEntries.reduce((s, e) => s + e.hours, 0)
  const pct = t.estimatedHours ? Math.min(logged / t.estimatedHours, 1) : 0
  const over = t.estimatedHours ? logged > t.estimatedHours : false
  const overdue = t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date()

  return (
    <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, opacity: draggedId === t.id ? 0.35 : t.status === 'DONE' ? 0.6 : 1 }}
      draggable={!mobile}
      onDragStart={e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; onDragStart?.(t.id) }}
      onDragEnd={() => onDragEnd?.()}>
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
          {onDetail && <button className="btn btn-ghost btn-sm" onClick={() => onDetail(t)}>Zobrazit</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(t)}>Upravit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDel(t.id, t.title)}>Smazat</button>
        </div>
      </div>
    </div>
  )
}
