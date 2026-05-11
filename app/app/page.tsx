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
  client: { id: string; name: string }
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
  task: { id: string; title: string }
  employee: { id: string; name: string }
}

const STATUS_CLASS: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  DONE: 'bg-green-100 text-green-700',
}
const STATUS_LABEL: Record<string, string> = { TODO: 'Čeká', IN_PROGRESS: 'Probíhá', DONE: 'Splněno' }

export default function AppPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [logModal, setLogModal] = useState<{ taskId: string; title: string } | null>(null)
  const [logForm, setLogForm] = useState({ hours: '', notes: '', date: new Date().toISOString().slice(0, 10) })
  const [filterStatus, setFilterStatus] = useState('')
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

  useEffect(() => {
    loadData()
  }, [loadData])

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

  const filteredTasks = tasks.filter((t) => !filterStatus || t.status === filterStatus)

  if (employees.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center text-gray-500 max-w-sm">
          <p className="mb-2">Zatím nejsou žádní zaměstnanci.</p>
          <Link href="/admin/employees" className="text-blue-600 hover:underline text-sm">Přidat v admin rozhraní →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-4 h-14">
          <span className="font-semibold text-blue-700">Marketing Tasks</span>
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
          <Link href="/admin" className="text-sm text-gray-400 hover:text-blue-600">Admin →</Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {!selectedId ? (
          <div className="card p-12 text-center text-gray-400 mt-8">Vyberte své jméno v záhlaví.</div>
        ) : loading ? (
          <p className="text-gray-500 mt-8">Načítám...</p>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex gap-4 mb-5 flex-wrap">
              <div className="card px-4 py-2 flex gap-6 text-sm">
                <span><span className="font-semibold">{tasks.filter(t => t.status !== 'DONE').length}</span> <span className="text-gray-500">aktivních</span></span>
                <span><span className="font-semibold">{tasks.filter(t => t.status === 'DONE').length}</span> <span className="text-gray-500">splněných</span></span>
                <span><span className="font-semibold">{totalHours.toFixed(1)} hod</span> <span className="text-gray-500">celkem</span></span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-gray-200">
              {(['tasks', 'hours'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t === 'tasks' ? 'Moje úkoly' : 'Odpracované hodiny'}
                </button>
              ))}
            </div>

            {tab === 'tasks' && (
              <>
                <div className="flex gap-2 mb-4">
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

                {filteredTasks.length === 0 ? (
                  <div className="card p-10 text-center text-gray-400">Žádné úkoly.</div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map((t) => {
                      const logged = t.timeEntries.reduce((s, e) => s + e.hours, 0)
                      const overdue = t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date()
                      return (
                        <div key={t.id} className={`card px-4 py-3 flex items-start gap-3 ${t.status === 'DONE' ? 'opacity-60' : ''}`}>
                          {/* Checkbox-like complete button */}
                          <button
                            onClick={() => setStatus(t.id, t.status === 'DONE' ? 'TODO' : 'DONE')}
                            className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                              t.status === 'DONE'
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-green-400'
                            }`}
                          >
                            {t.status === 'DONE' && <span className="text-xs font-bold">✓</span>}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {t.type === 'RECURRING' && (
                                <span title="Pravidelný úkol" className="text-blue-500 text-xs font-bold">↺</span>
                              )}
                              <span className={`font-medium ${t.status === 'DONE' ? 'line-through' : ''}`}>{t.title}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                              {overdue && <span className="text-xs text-red-600 font-medium">Po termínu</span>}
                            </div>
                            <div className="text-sm text-gray-500 flex gap-3 mt-0.5 flex-wrap">
                              <span className="font-medium text-gray-700">{t.client.name}</span>
                              {t.dueDate && <span className={overdue ? 'text-red-500' : ''}>{new Date(t.dueDate).toLocaleDateString('cs')}</span>}
                              <span>{logged.toFixed(1)} / {t.estimatedHours ?? '?'} hod</span>
                            </div>
                            {t.description && <p className="text-sm text-gray-400 mt-0.5">{t.description}</p>}
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
                {entries.length === 0 ? (
                  <div className="card p-10 text-center text-gray-400">Zatím žádné záznamy hodin.</div>
                ) : (
                  <div className="card divide-y divide-gray-100">
                    {entries.map((e) => (
                      <div key={e.id} className="flex items-center px-4 py-3 gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{e.task.title}</div>
                          <div className="text-xs text-gray-400">{new Date(e.date).toLocaleDateString('cs')}</div>
                          {e.notes && <div className="text-xs text-gray-400">{e.notes}</div>}
                        </div>
                        <div className="font-semibold text-blue-700 shrink-0">{e.hours} hod</div>
                        <button className="btn-ghost text-xs text-red-500" onClick={() => delEntry(e.id)}>✕</button>
                      </div>
                    ))}
                    <div className="px-4 py-3 flex justify-between text-sm font-semibold bg-gray-50">
                      <span>Celkem</span>
                      <span>{totalHours.toFixed(1)} hod</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Log hours modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-1">Zaznamenat hodiny</h2>
            <p className="text-sm text-gray-500 mb-4">{logModal.title}</p>
            <div className="space-y-3">
              <div>
                <label className="label">Počet hodin *</label>
                <input
                  className="input"
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={logForm.hours}
                  onChange={(e) => setLogForm({ ...logForm, hours: e.target.value })}
                  placeholder="1.5"
                />
              </div>
              <div>
                <label className="label">Datum</label>
                <input
                  className="input"
                  type="date"
                  value={logForm.date}
                  onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Poznámka</label>
                <input
                  className="input"
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  placeholder="Co jsi dělal/a..."
                />
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
