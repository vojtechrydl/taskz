'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

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
type TimeEntry = {
  id: string
  hours: number
  date: string
  notes: string | null
  task: { id: string; title: string; client: { id: string; name: string; color: string | null } } | null
  client: { id: string; name: string; color: string | null } | null
  employee: { id: string; name: string }
}

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

const STATUS_CLASS: Record<string, string> = {
  TODO:        'bg-[#2A2D30] text-[#8B9099]',
  ASSIGNED:    'bg-sky-500/15 text-sky-400',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400',
  DONE:        'bg-emerald-500/15 text-emerald-400',
}
const STATUS_LABEL: Record<string, string> = { TODO: 'Čeká', ASSIGNED: 'Zadáno', IN_PROGRESS: 'Probíhá', DONE: 'Splněno' }

const MONTH_NAMES = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']

function monthKey(date: string) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string) {
  const [year, month] = key.split('-')
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
}

export default function AppPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [allClients, setAllClients] = useState<{ id: string; name: string; color: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [logModal, setLogModal] = useState<{ taskId: string; title: string } | null>(null)
  const [logForm, setLogForm] = useState({ hours: '', notes: '', date: new Date().toISOString().slice(0, 10) })
  const [manualModal, setManualModal] = useState(false)
  const [manualForm, setManualForm] = useState({ hours: '', notes: '', date: new Date().toISOString().slice(0, 10), clientId: '' })
  const [filterClient, setFilterClient] = useState('')
  const [tab, setTab] = useState<'tasks' | 'hours'>('tasks')
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<{ id: string; text: string; createdAt: string; employee: { id: string; name: string } }[]>([])
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    fetch('/api/employees')
      .then((r) => r.json())
      .then((data: Employee[]) => {
        setEmployees(data)
        const saved = localStorage.getItem('employeeId')
        if (saved && data.find((e) => e.id === saved)) setSelectedId(saved)
      })
    fetch('/api/clients').then((r) => r.json()).then(setAllClients)
  }, [])

  const loadData = useCallback(() => {
    if (!selectedId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/tasks?employeeId=${selectedId}`).then((r) => r.json()),
      fetch(`/api/time-entries?employeeId=${selectedId}`).then((r) => r.json()),
    ]).then(([t, e]) => {
      setTasks(t)
      setEntries(e)
      setLoading(false)
    })
  }, [selectedId])

  useEffect(() => { loadData() }, [loadData])

  const selectEmployee = (id: string) => {
    setSelectedId(id)
    localStorage.setItem('employeeId', id)
  }

  const setStatus = async (taskId: string, status: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as Task['status'] } : t))
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  const openLog = (t: Task) => {
    setLogForm({ hours: '', notes: '', date: new Date().toISOString().slice(0, 10) })
    setLogModal({ taskId: t.id, title: t.title })
  }

  const submitLog = async () => {
    if (!logModal || !logForm.hours || !selectedId) return
    await fetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: logModal.taskId,
        employeeId: selectedId,
        hours: logForm.hours,
        date: logForm.date,
        notes: logForm.notes,
      }),
    })
    setLogModal(null)
    loadData()
  }

  const openManual = () => {
    setManualForm({ hours: '', notes: '', date: new Date().toISOString().slice(0, 10), clientId: '' })
    setManualModal(true)
  }

  const submitManual = async () => {
    if (!manualForm.hours || !selectedId) return
    await fetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: selectedId,
        hours: manualForm.hours,
        date: manualForm.date,
        notes: manualForm.notes,
        clientId: manualForm.clientId || null,
      }),
    })
    setManualModal(false)
    loadData()
  }

  const openDetail = async (t: Task) => {
    setDetailTask(t)
    setCommentText('')
    const data = await fetch(`/api/tasks/${t.id}/comments`).then(r => r.json())
    setComments(data)
  }

  const submitComment = async () => {
    if (!commentText.trim() || !detailTask || !selectedId) return
    const c = await fetch(`/api/tasks/${detailTask.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: selectedId, text: commentText.trim() }),
    }).then(r => r.json())
    setComments(prev => [...prev, c])
    setCommentText('')
  }

  const renderDescription = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.split(urlRegex).map((part, i) =>
      urlRegex.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#A78BFA] underline hover:text-[#7C3AED] break-all">{part}</a>
        : <span key={i}>{part}</span>
    )
  }

  const delEntry = async (id: string) => {
    if (!confirm('Smazat záznam?')) return
    await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
    loadData()
  }

  const totalHours = entries.reduce((s, e) => s + e.hours, 0)
  const filteredTasks = tasks.filter((t) =>
    (!filterClient || t.client.id === filterClient)
  )

  // Unique clients from tasks for filter
  const taskClients = Array.from(new Map(tasks.map(t => [t.client.id, t.client])).values())

  // Group entries by month, optionally filtered by client
  const filteredEntries = filterClient
    ? entries.filter(e => (e.task?.client?.id ?? e.client?.id) === filterClient)
    : entries

  const entriesByMonth = filteredEntries.reduce<Record<string, TimeEntry[]>>((acc, e) => {
    const key = monthKey(e.date)
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {})
  const sortedMonths = Object.keys(entriesByMonth).sort((a, b) => b.localeCompare(a))

  if (employees.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center max-w-sm">
          <p className="text-[#8B9099] mb-3 text-sm">Zatím nejsou žádní zaměstnanci.</p>
          <Link href="/admin/employees" className="text-[#A78BFA] hover:text-[#7C3AED] text-sm transition-colors">
            Přidat v admin rozhraní →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#161819] border-b border-[#2A2D30] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-3 h-14">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
            <span className="font-semibold text-white text-sm">TASKZ</span>
          </div>
          <div className="flex-1" />
          <select
            className="input w-auto text-sm max-w-[140px]"
            value={selectedId}
            onChange={(e) => selectEmployee(e.target.value)}
          >
            <option value="">Vyberte sebe</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <Link href="/admin" className="text-sm text-[#8B9099] hover:text-[#F0F2F4] transition-colors shrink-0">
            Admin →
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {!selectedId ? (
          <div className="card p-12 text-center text-[#8B9099] text-sm mt-8">Vyberte své jméno v záhlaví.</div>
        ) : loading ? (
          <p className="text-[#8B9099] text-sm mt-8">Načítám...</p>
        ) : (
          <>
            {/* Summary bar */}
            <div className="card px-5 py-3 flex gap-6 text-sm mb-5">
              <span>
                <span className="font-semibold text-white">{tasks.filter(t => t.status !== 'DONE').length}</span>
                <span className="text-[#8B9099] ml-1.5">aktivních</span>
              </span>
              <span>
                <span className="font-semibold text-white">{tasks.filter(t => t.status === 'DONE').length}</span>
                <span className="text-[#8B9099] ml-1.5">splněných</span>
              </span>
              <span>
                <span className="font-semibold text-white">{totalHours.toFixed(1)} hod</span>
                <span className="text-[#8B9099] ml-1.5">celkem</span>
              </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 mb-5 border-b border-[#2A2D30]">
              {(['tasks', 'hours'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t
                      ? 'border-[#7C3AED] text-[#A78BFA]'
                      : 'border-transparent text-[#8B9099] hover:text-[#F0F2F4]'
                  }`}
                >
                  {t === 'tasks' ? 'Moje úkoly' : 'Odpracované hodiny'}
                </button>
              ))}
            </div>

            {tab === 'tasks' && (
              <>
                {taskClients.length > 1 && (
                  <div className="mb-4">
                    <select className="input w-auto text-sm" value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
                      <option value="">Všichni klienti</option>
                      {taskClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {/* DESKTOP: Kanban */}
                {(() => {
                  const COLS = [
                    { status: 'TODO',        label: 'Čeká',    dot: 'bg-[#8B9099]' },
                    { status: 'ASSIGNED',    label: 'Zadáno',  dot: 'bg-sky-400' },
                    { status: 'IN_PROGRESS', label: 'Probíhá', dot: 'bg-amber-400' },
                    { status: 'DONE',        label: 'Hotovo',  dot: 'bg-emerald-400' },
                  ] as const
                  return (
                    <>
                      <div className="hidden md:grid grid-cols-4 gap-3">
                        {COLS.map((col) => {
                          const colTasks = filteredTasks.filter(t => t.status === col.status)
                          const isOver = dragOverCol === col.status
                          return (
                            <div key={col.status} className="flex flex-col"
                              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(col.status) }}
                              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null) }}
                              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) setStatus(id, col.status); setDragOverCol(null) }}
                            >
                              <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border border-b-0 border-[#2A2D30] bg-[#161819] ${isOver ? 'border-[#7C3AED]/50 bg-[#7C3AED]/5' : ''}`}>
                                <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                                <span className="text-sm font-medium text-[#F0F2F4]">{col.label}</span>
                                <span className="ml-auto text-xs text-[#8B9099] bg-[#2A2D30] px-1.5 py-0.5 rounded">{colTasks.length}</span>
                              </div>
                              <div className={`p-2 rounded-b-lg border border-[#2A2D30] space-y-2 min-h-[160px] ${isOver ? 'border-[#7C3AED]/50 bg-[#7C3AED]/5' : 'bg-[#0D0E0F]'}`}>
                                {colTasks.map(t => {
                                  const logged = t.timeEntries.reduce((s, e) => s + e.hours, 0)
                                  const overdue = t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date()
                                  return (
                                    <div key={t.id}
                                      className={`card p-3 cursor-grab active:cursor-grabbing hover:border-[#3A3D40] transition-colors ${t.status === 'DONE' ? 'opacity-50' : ''}`}
                                      draggable
                                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move' }}
                                      onDragEnd={() => setDragOverCol(null)}
                                    >
                                      <button className="font-medium text-sm text-[#F0F2F4] mb-2 leading-snug text-left hover:text-[#A78BFA] transition-colors w-full" onClick={() => openDetail(t)}>
                                        {t.type === 'RECURRING' && <span className="text-[#A78BFA] mr-1">↺</span>}
                                        {t.title}
                                        {overdue && <span className="ml-1.5 text-xs text-red-400">Po termínu</span>}
                                      </button>
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="inline-flex items-center gap-1">
                                          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: t.client.color || '#6B7280' }} />
                                          <span className="text-xs text-[#8B9099]">{t.client.name}</span>
                                        </span>
                                        {t.dueDate && <span className={`text-xs font-medium ${dueDateClass(t.dueDate, t.status)}`}>· {new Date(t.dueDate).toLocaleDateString('cs')}</span>}
                                      </div>
                                      {(t.estimatedHours != null || logged > 0) && (
                                        <div className="text-xs text-[#8B9099] mb-2">{fmtHours(logged)}{t.estimatedHours != null ? `/${fmtHours(t.estimatedHours)}` : ''} hod</div>
                                      )}
                                      {t.description && <p className="text-xs text-[#8B9099]/60 mb-2 line-clamp-2">{t.description}</p>}
                                      <div className="flex gap-1">
                                        {COLS.indexOf(col) > 0 && (
                                          <button className="btn-ghost text-xs py-0.5 px-2" onClick={() => setStatus(t.id, COLS[COLS.indexOf(col) - 1].status)} title="Přesunout vlevo">←</button>
                                        )}
                                        {COLS.indexOf(col) < COLS.length - 1 && (
                                          <button className="btn-ghost text-xs py-0.5 px-2" onClick={() => setStatus(t.id, COLS[COLS.indexOf(col) + 1].status)} title="Přesunout vpravo">→</button>
                                        )}
                                        <button className="btn-secondary text-xs flex-1" onClick={() => openLog(t)}>+ Hodiny</button>
                                      </div>
                                    </div>
                                  )
                                })}
                                {colTasks.length === 0 && (
                                  <div className="flex items-center justify-center h-16 text-xs text-[#8B9099]/40">Přetáhni sem</div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* MOBILE: Grouped list */}
                      <div className="md:hidden space-y-5">
                        {COLS.map((col) => {
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
                                {colTasks.map(t => {
                                  const logged = t.timeEntries.reduce((s, e) => s + e.hours, 0)
                                  const overdue = t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date()
                                  return (
                                    <div key={t.id} className={`card px-4 py-3 ${t.status === 'DONE' ? 'opacity-50' : ''}`}>
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <button className={`font-medium text-sm text-left hover:text-[#A78BFA] transition-colors ${t.status === 'DONE' ? 'line-through text-[#8B9099]' : 'text-[#F0F2F4]'}`} onClick={() => openDetail(t)}>
                                          {t.type === 'RECURRING' && <span className="text-[#A78BFA] mr-1">↺</span>}
                                          {t.title}
                                        </button>
                                        <button className="btn-secondary text-xs shrink-0" onClick={() => openLog(t)}>+ Hodiny</button>
                                      </div>
                                      <div className="text-xs text-[#8B9099] flex gap-2 flex-wrap items-center mb-1">
                                        <span className="inline-flex items-center gap-1">
                                          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: t.client.color || '#6B7280' }} />
                                          <span>{t.client.name}</span>
                                        </span>
                                        {t.dueDate && <span className={`font-medium ${dueDateClass(t.dueDate, t.status)}`}>· {new Date(t.dueDate).toLocaleDateString('cs')}</span>}
                                      </div>
                                      {(t.estimatedHours != null || logged > 0) && (
                                        <div className="text-xs text-[#8B9099] mb-2">{fmtHours(logged)}{t.estimatedHours != null ? `/${fmtHours(t.estimatedHours)}` : ''} hod</div>
                                      )}
                                      {t.status !== 'DONE' && (
                                        <div className="flex gap-1 flex-wrap">
                                          {COLS.filter(c => c.status !== col.status && c.status !== 'DONE').map(c => (
                                            <button key={c.status} className="btn-ghost text-xs py-0.5 px-2" onClick={() => setStatus(t.id, c.status)}>→ {c.label}</button>
                                          ))}
                                          <button className="btn-ghost text-xs py-0.5 px-2 text-emerald-400" onClick={() => setStatus(t.id, 'DONE')}>✓ Hotovo</button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                        {filteredTasks.length === 0 && (
                          <div className="card p-10 text-center text-[#8B9099] text-sm">Žádné úkoly.</div>
                        )}
                      </div>
                    </>
                  )
                })()}
              </>
            )}

            {tab === 'hours' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <button className="btn-primary text-sm" onClick={openManual}>+ Přidat hodiny</button>
                  {taskClients.length > 1 && (
                    <select
                      className="input w-auto text-sm"
                      value={filterClient}
                      onChange={(e) => setFilterClient(e.target.value)}
                    >
                      <option value="">Všichni klienti</option>
                      {taskClients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {filteredEntries.length === 0 ? (
                  <div className="card p-10 text-center text-[#8B9099] text-sm">Zatím žádné záznamy hodin.</div>
                ) : (
                  <div className="space-y-4">
                    {sortedMonths.map((month) => {
                      const monthEntries = entriesByMonth[month]
                      const monthTotal = monthEntries.reduce((s, e) => s + e.hours, 0)
                      return (
                        <div key={month}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-[#8B9099] uppercase tracking-wide">
                              {monthLabel(month)}
                            </h3>
                            <span className="text-xs text-[#A78BFA] font-semibold">{monthTotal.toFixed(1)} hod</span>
                          </div>
                          <div className="card divide-y divide-[#2A2D30]">
                            {monthEntries.map((e) => (
                              <div key={e.id} className="flex items-center px-4 py-3 gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-[#F0F2F4]">
                                    {e.task ? e.task.title : (e.notes || <span className="text-[#8B9099] italic">Bez úkolu</span>)}
                                  </div>
                                  <div className="text-xs text-[#8B9099] flex gap-3 mt-0.5 items-center flex-wrap">
                                    {(() => { const c = e.task?.client ?? e.client; return c ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: c.color || '#6B7280' }} />
                                        <span>{c.name}</span>
                                      </span>
                                    ) : null })()}
                                    {!e.task && <span className="text-[#8B9099]/60 italic">Bez úkolu</span>}
                                    <span>{new Date(e.date).toLocaleDateString('cs')}</span>
                                    {e.task && e.notes && <span className="text-[#8B9099]/60">{e.notes}</span>}
                                  </div>
                                </div>
                                <div className="font-semibold text-[#A78BFA] text-sm shrink-0">{e.hours} hod</div>
                                <button className="btn-ghost text-xs text-red-400 hover:text-red-300" onClick={() => delEntry(e.id)}>✕</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {detailTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-[#2A2D30]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white leading-snug">{detailTask.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: detailTask.client.color || '#6B7280' }} />
                      <span className="text-xs text-[#8B9099]">{detailTask.client.name}</span>
                    </span>
                    {detailTask.dueDate && (
                      <span className="text-xs text-[#8B9099]">· {new Date(detailTask.dueDate).toLocaleDateString('cs')}</span>
                    )}
                  </div>
                </div>
                <button className="btn-ghost text-lg leading-none shrink-0" onClick={() => setDetailTask(null)}>✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Description */}
              {detailTask.description ? (
                <div>
                  <p className="text-xs font-semibold text-[#8B9099] uppercase tracking-wide mb-2">Popis</p>
                  <div className="text-sm text-[#C0C6CC] leading-relaxed whitespace-pre-wrap">
                    {renderDescription(detailTask.description)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#8B9099]/60 italic">Bez popisu.</p>
              )}

              {/* Comments */}
              <div>
                <p className="text-xs font-semibold text-[#8B9099] uppercase tracking-wide mb-3">
                  Komentáře {comments.length > 0 && <span className="text-[#8B9099]/60">({comments.length})</span>}
                </p>
                {comments.length === 0 ? (
                  <p className="text-sm text-[#8B9099]/60 italic">Zatím žádné komentáře.</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#7C3AED1A] border border-[#7C3AED]/30 text-[#A78BFA] text-xs font-semibold flex items-center justify-center shrink-0">
                          {c.employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-xs font-medium text-[#F0F2F4]">{c.employee.name}</span>
                            <span className="text-xs text-[#8B9099]/60">{new Date(c.createdAt).toLocaleString('cs', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-sm text-[#C0C6CC] leading-relaxed whitespace-pre-wrap">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Add comment */}
            <div className="px-6 pb-5 pt-4 border-t border-[#2A2D30]">
              <div className="flex gap-2">
                <textarea
                  className="input resize-none flex-1 text-sm"
                  rows={2}
                  placeholder="Přidat komentář..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment() }}
                />
                <button className="btn-primary self-end" onClick={submitComment}>Odeslat</button>
              </div>
              <p className="text-xs text-[#8B9099]/40 mt-1">Cmd+Enter pro odeslání</p>
            </div>
          </div>
        </div>
      )}

      {manualModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-white mb-1">Přidat hodiny ručně</h2>
            <p className="text-xs text-[#8B9099] mb-4">Zpětný záznam bez vazby na úkol</p>
            <div className="space-y-3">
              <div>
                <label className="label">Počet hodin *</label>
                <input className="input" type="number" min="0.25" step="0.25" value={manualForm.hours}
                  onChange={(e) => setManualForm({ ...manualForm, hours: e.target.value })} placeholder="1.5" />
              </div>
              <div>
                <label className="label">Datum</label>
                <input className="input" type="date" value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })} />
              </div>
              <div>
                <label className="label">Klient</label>
                <select className="input" value={manualForm.clientId}
                  onChange={(e) => setManualForm({ ...manualForm, clientId: e.target.value })}>
                  <option value="">Bez klienta</option>
                  {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Poznámka</label>
                <input className="input" value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} placeholder="Co jsi dělal/a..." />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn-secondary" onClick={() => setManualModal(false)}>Zrušit</button>
              <button className="btn-primary" onClick={submitManual}>Uložit</button>
            </div>
          </div>
        </div>
      )}

      {logModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-white mb-1">Zaznamenat hodiny</h2>
            <p className="text-xs text-[#8B9099] mb-4">{logModal.title}</p>
            <div className="space-y-3">
              <div>
                <label className="label">Počet hodin *</label>
                <input className="input" type="number" min="0.25" step="0.25" value={logForm.hours}
                  onChange={(e) => setLogForm({ ...logForm, hours: e.target.value })} placeholder="1.5" />
              </div>
              <div>
                <label className="label">Datum</label>
                <input className="input" type="date" value={logForm.date}
                  onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} />
              </div>
              <div>
                <label className="label">Poznámka</label>
                <input className="input" value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} placeholder="Co jsi dělal/a..." />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn-secondary" onClick={() => setLogModal(null)}>Zrušit</button>
              <button className="btn-primary" onClick={submitLog}>Uložit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
