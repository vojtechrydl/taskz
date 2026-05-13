'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type Employee = { id: string; name: string }
type Task = {
  id: string
  title: string
  description: string | null
  type: 'ONE_TIME' | 'RECURRING'
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
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
  task: { id: string; title: string; client: { id: string; name: string; color: string | null } }
  employee: { id: string; name: string }
}

const STATUS_CLASS: Record<string, string> = {
  TODO: 'bg-[#2A2D30] text-[#8B9099]',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400',
  DONE: 'bg-emerald-500/15 text-emerald-400',
}
const STATUS_LABEL: Record<string, string> = { TODO: 'Čeká', IN_PROGRESS: 'Probíhá', DONE: 'Splněno' }

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
  const [loading, setLoading] = useState(false)
  const [logModal, setLogModal] = useState<{ taskId: string; title: string } | null>(null)
  const [logForm, setLogForm] = useState({ hours: '', notes: '', date: new Date().toISOString().slice(0, 10) })
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [tab, setTab] = useState<'tasks' | 'hours'>('tasks')

  useEffect(() => {
    fetch('/api/employees')
      .then((r) => r.json())
      .then((data: Employee[]) => {
        setEmployees(data)
        const saved = localStorage.getItem('employeeId')
        if (saved && data.find((e) => e.id === saved)) setSelectedId(saved)
      })
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
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadData()
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

  const delEntry = async (id: string) => {
    if (!confirm('Smazat záznam?')) return
    await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
    loadData()
  }

  const totalHours = entries.reduce((s, e) => s + e.hours, 0)
  const filteredTasks = tasks.filter((t) =>
    (!filterStatus || t.status === filterStatus) &&
    (!filterClient || t.client.id === filterClient)
  )

  // Unique clients from tasks for filter
  const taskClients = Array.from(new Map(tasks.map(t => [t.client.id, t.client])).values())

  // Group entries by month, optionally filtered by client
  const filteredEntries = filterClient
    ? entries.filter(e => e.task.client.id === filterClient)
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
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
            <span className="font-semibold text-white text-sm">Marketing Tasks</span>
          </div>
          <div className="flex-1" />
          <select
            className="input w-auto text-sm"
            value={selectedId}
            onChange={(e) => selectEmployee(e.target.value)}
          >
            <option value="">Vyberte sebe</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <Link href="/admin" className="text-sm text-[#8B9099] hover:text-[#F0F2F4] transition-colors">
            Admin →
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
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
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex gap-2">
                    {['', 'TODO', 'IN_PROGRESS', 'DONE'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`btn text-xs ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        {s === '' ? 'Vše' : STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                  {taskClients.length > 1 && (
                    <select
                      className="input w-auto text-xs"
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

                {filteredTasks.length === 0 ? (
                  <div className="card p-10 text-center text-[#8B9099] text-sm">Žádné úkoly.</div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map((t) => {
                      const logged = t.timeEntries.reduce((s, e) => s + e.hours, 0)
                      const overdue = t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date()
                      return (
                        <div key={t.id} className={`card px-4 py-3 flex items-start gap-3 hover:border-[#3A3D40] transition-colors ${t.status === 'DONE' ? 'opacity-50' : ''}`}>
                          <button
                            onClick={() => setStatus(t.id, t.status === 'DONE' ? 'TODO' : 'DONE')}
                            className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                              t.status === 'DONE'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-[#3A3D40] hover:border-emerald-500'
                            }`}
                          >
                            {t.status === 'DONE' && <span className="text-xs font-bold">✓</span>}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {t.type === 'RECURRING' && (
                                <span className="text-[#A78BFA] text-xs font-bold">↺</span>
                              )}
                              <span className={`font-medium text-sm text-[#F0F2F4] ${t.status === 'DONE' ? 'line-through text-[#8B9099]' : ''}`}>
                                {t.title}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_CLASS[t.status]}`}>
                                {STATUS_LABEL[t.status]}
                              </span>
                              {overdue && <span className="text-xs text-red-400 font-medium">Po termínu</span>}
                            </div>
                            <div className="text-xs text-[#8B9099] flex gap-3 mt-1 flex-wrap items-center">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: t.client.color || '#6B7280' }} />
                                <span className="text-[#C0C6CC]">{t.client.name}</span>
                              </span>
                              {t.dueDate && (
                                <span className={overdue ? 'text-red-400' : ''}>
                                  {new Date(t.dueDate).toLocaleDateString('cs')}
                                </span>
                              )}
                              <span>{logged.toFixed(1)} / {t.estimatedHours ?? '?'} hod</span>
                            </div>
                            {t.description && <p className="text-xs text-[#8B9099]/60 mt-0.5">{t.description}</p>}
                          </div>

                          <div className="flex gap-1.5 shrink-0">
                            {t.status === 'TODO' && (
                              <button className="btn-ghost text-xs" onClick={() => setStatus(t.id, 'IN_PROGRESS')}>Zahájit</button>
                            )}
                            <button className="btn-secondary text-xs" onClick={() => openLog(t)}>+ Hodiny</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {tab === 'hours' && (
              <div>
                {/* Client filter for hours */}
                {taskClients.length > 1 && (
                  <div className="mb-4">
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
                  </div>
                )}

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
                                  <div className="font-medium text-sm text-[#F0F2F4]">{e.task.title}</div>
                                  <div className="text-xs text-[#8B9099] flex gap-3 mt-0.5 items-center">
                                    <span className="inline-flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: e.task.client.color || '#6B7280' }} />
                                      <span>{e.task.client.name}</span>
                                    </span>
                                    <span>{new Date(e.date).toLocaleDateString('cs')}</span>
                                    {e.notes && <span className="text-[#8B9099]/60">{e.notes}</span>}
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

                    <div className="card px-4 py-3 flex justify-between text-sm font-semibold">
                      <span className="text-[#8B9099]">Celkem</span>
                      <span className="text-white">{filteredEntries.reduce((s, e) => s + e.hours, 0).toFixed(1)} hod</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

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
