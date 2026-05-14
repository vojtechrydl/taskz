'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

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
type TimeEntry = {
  id: string; hours: number; date: string; notes: string | null
  task: { id: string; title: string; client: { id: string; name: string; color: string | null } } | null
  client: { id: string; name: string; color: string | null } | null
  employee: { id: string; name: string }
}

const DAYS = ['Neděle','Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota']
const MONTHS = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince']
const MONTH_NAMES = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec']

const COLS = [
  { id: 'TODO',         label: 'Čeká',    colClass: 'kcol--wait',  dotClass: 'status-dot--wait' },
  { id: 'ASSIGNED',    label: 'Zadáno',  colClass: 'kcol--todo',  dotClass: 'status-dot--todo' },
  { id: 'IN_PROGRESS', label: 'Probíhá', colClass: 'kcol--doing', dotClass: 'status-dot--doing' },
  { id: 'DONE',        label: 'Hotovo',  colClass: 'kcol--done',  dotClass: 'status-dot--done' },
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

function monthKey(date: string) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function monthLabel(key: string) { const [year, month] = key.split('-'); return `${MONTH_NAMES[parseInt(month) - 1]} ${year}` }

export default function AppPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [allClients, setAllClients] = useState<{ id: string; name: string; color: string | null }[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [logModal, setLogModal] = useState<{ taskId: string; title: string } | null>(null)
  const [logForm, setLogForm] = useState({ hours: '', notes: '', date: new Date().toISOString().slice(0, 10) })
  const [manualModal, setManualModal] = useState(false)
  const [manualForm, setManualForm] = useState({ hours: '', notes: '', date: new Date().toISOString().slice(0, 10), clientId: '' })
  const [filterClient, setFilterClient] = useState('')
  const [tab, setTab] = useState<'tasks' | 'hours'>('tasks')
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<{ id: string; text: string; createdAt: string; employee: { id: string; name: string } }[]>([])
  const [commentText, setCommentText] = useState('')

  const now = new Date()
  const dateStr = `${DAYS[now.getDay()]} ${now.getDate()}. ${MONTHS[now.getMonth()]}`

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then((data: Employee[]) => {
      setEmployees(data)
      const saved = localStorage.getItem('employeeId')
      if (saved && data.find(e => e.id === saved)) setSelectedId(saved)
    })
    fetch('/api/clients').then(r => r.json()).then(setAllClients)
  }, [])

  const loadData = useCallback(() => {
    if (!selectedId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/tasks?employeeId=${selectedId}`).then(r => r.json()),
      fetch(`/api/time-entries?employeeId=${selectedId}`).then(r => r.json()),
    ]).then(([t, e]) => { setTasks(t); setEntries(e); setLoading(false) })
  }, [selectedId])

  useEffect(() => { loadData() }, [loadData])

  const selectEmployee = (id: string) => { setSelectedId(id); localStorage.setItem('employeeId', id); setShowSwitcher(false) }

  const setStatus = async (taskId: string, status: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as Task['status'] } : t))
    await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
  }

  const openLog = (t: Task) => { setLogForm({ hours: '', notes: '', date: new Date().toISOString().slice(0, 10) }); setLogModal({ taskId: t.id, title: t.title }) }

  const submitLog = async () => {
    if (!logModal || !logForm.hours || !selectedId) return
    await fetch('/api/time-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: logModal.taskId, employeeId: selectedId, hours: logForm.hours, date: logForm.date, notes: logForm.notes }) })
    setLogModal(null); loadData()
  }

  const openManual = () => { setManualForm({ hours: '', notes: '', date: new Date().toISOString().slice(0, 10), clientId: '' }); setManualModal(true) }

  const submitManual = async () => {
    if (!manualForm.hours || !selectedId) return
    await fetch('/api/time-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: selectedId, hours: manualForm.hours, date: manualForm.date, notes: manualForm.notes, clientId: manualForm.clientId || null }) })
    setManualModal(false); loadData()
  }

  const delEntry = async (id: string) => {
    if (!confirm('Smazat záznam?')) return
    await fetch(`/api/time-entries/${id}`, { method: 'DELETE' }); loadData()
  }

  const openDetail = async (t: Task) => {
    setDetailTask(t); setCommentText('')
    const data = await fetch(`/api/tasks/${t.id}/comments`).then(r => r.json())
    setComments(data)
  }

  const submitComment = async () => {
    if (!commentText.trim() || !detailTask || !selectedId) return
    const c = await fetch(`/api/tasks/${detailTask.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: selectedId, text: commentText.trim() }) }).then(r => r.json())
    setComments(prev => [...prev, c]); setCommentText('')
  }

  const renderDescription = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.split(urlRegex).map((part, i) =>
      urlRegex.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>
        : <span key={i}>{part}</span>
    )
  }

  const filteredTasks = tasks.filter(t => !filterClient || t.client.id === filterClient)
  const taskClients = Array.from(new Map(tasks.map(t => [t.client.id, t.client])).values())

  const filteredEntries = filterClient ? entries.filter(e => (e.task?.client?.id ?? e.client?.id) === filterClient) : entries
  const entriesByMonth = filteredEntries.reduce<Record<string, TimeEntry[]>>((acc, e) => {
    const key = monthKey(e.date); if (!acc[key]) acc[key] = []; acc[key].push(e); return acc
  }, {})
  const sortedMonths = Object.keys(entriesByMonth).sort((a, b) => b.localeCompare(a))

  const totalHours = entries.reduce((s, e) => s + e.hours, 0)
  const activeTasks = tasks.filter(t => t.status !== 'DONE').length
  const doneTasks = tasks.filter(t => t.status === 'DONE').length

  const selectedEmp = employees.find(e => e.id === selectedId)

  if (employees.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass" style={{ padding: 32, textAlign: 'center', maxWidth: 360 }}>
          <p style={{ color: 'var(--ink-3)', marginBottom: 12 }}>Zatím nejsou žádní zaměstnanci.</p>
          <Link href="/admin/employees" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>Přidat v admin rozhraní →</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <div style={{ position: 'fixed', top: 18, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div className="topnav" style={{ pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px 8px 8px', marginRight: 4 }}>
            <div className="mark">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3.5h10M7 3.5V11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontWeight: 600, letterSpacing: '0.04em', fontSize: 13, color: 'var(--ink-1)' }}>TASKZ</span>
          </div>
          <div className="nav-divider" />
          <Link href="/admin" className="nav-pill" style={{ color: 'var(--ink-3)' }}>Admin</Link>
          <div className="nav-divider" />
          {/* Employee switcher */}
          <div style={{ position: 'relative' }}>
            <button className="nav-pill is-active" onClick={() => setShowSwitcher(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedEmp ? (
                <>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: `oklch(70% 0.16 ${hueForId(selectedEmp.id)})`, display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                    {initials(selectedEmp.name)}
                  </span>
                  Pohled zaměstnance
                </>
              ) : 'Vyberte sebe ▾'}
            </button>
            {showSwitcher && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 220, zIndex: 20, padding: 6, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid var(--glass-border-2)', borderRadius: 16, boxShadow: '0 20px 40px -10px rgba(20,18,30,0.22)' }}>
                {employees.map(e => (
                  <button key={e.id} onClick={() => selectEmployee(e.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, border: 0, background: e.id === selectedId ? 'rgba(20,18,30,0.06)' : 'transparent', cursor: 'pointer', font: '500 13px/1 var(--font-sans)', color: 'var(--ink-1)' }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: `oklch(70% 0.16 ${hueForId(e.id)})`, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials(e.name)}</span>
                    {e.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ paddingTop: 88, paddingBottom: 64, paddingLeft: 24, paddingRight: 24, maxWidth: 1280, width: '100%', margin: '0 auto' }} className="fade-up">
        {!selectedId ? (
          <div className="glass" style={{ padding: 48, textAlign: 'center', marginTop: 32 }}>
            <p style={{ color: 'var(--ink-3)' }}>Vyberte své jméno v záhlaví.</p>
          </div>
        ) : loading ? (
          <p style={{ color: 'var(--ink-3)', marginTop: 32 }}>Načítám...</p>
        ) : (
          <>
            {/* Hero */}
            <div className="glass-strong" style={{ padding: '36px 40px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, marginBottom: 28, background: 'linear-gradient(135deg, oklch(96% 0.04 220 / 0.7), oklch(97% 0.03 290 / 0.6))' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 8 }}>Dobré ráno · {dateStr}</div>
                <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px', color: 'var(--ink-1)' }}>
                  {selectedEmp?.name.split(' ')[0]}, máš dnes <em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>{activeTasks} aktivních</em> úkolů.
                </h2>
                <div style={{ display: 'flex', gap: 24 }}>
                  {[{ v: activeTasks, l: 'aktivních' }, { v: doneTasks, l: 'splněných' }, { v: `${fmtHours(totalHours)}h`, l: 'odpracováno' }].map(s => (
                    <div key={s.l}>
                      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div className="segmented">
                <button className={tab === 'tasks' ? 'is-on' : ''} onClick={() => setTab('tasks')}>Moje úkoly</button>
                <button className={tab === 'hours' ? 'is-on' : ''} onClick={() => setTab('hours')}>Odpracované hodiny</button>
              </div>
              {taskClients.length > 1 && (
                <select className="field-pill" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
                  <option value="">Klient · Všichni</option>
                  {taskClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            {tab === 'tasks' && (
              <>
                {/* Desktop kanban */}
                <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, alignItems: 'start' }}>
                  {COLS.map(col => {
                    const colTasks = filteredTasks.filter(t => t.status === col.id)
                    const isOver = dragOver === col.id
                    const colIdx = COLS.findIndex(c => c.id === col.id)
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
                        ) : colTasks.map(t => {
                          const logged = t.timeEntries.reduce((s, e) => s + e.hours, 0)
                          const pct = t.estimatedHours ? Math.min(logged / t.estimatedHours, 1) : 0
                          const over = t.estimatedHours ? logged > t.estimatedHours : false
                          return (
                            <div key={t.id} className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, opacity: t.status === 'DONE' ? 0.6 : 1 }}
                              draggable
                              onDragStart={e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move' }}
                              onDragEnd={() => setDragOver(null)}>
                              <button style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3, color: 'var(--ink-1)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, textDecoration: t.status === 'DONE' ? 'line-through' : 'none' }} onClick={() => openDetail(t)}>
                                {t.type === 'RECURRING' && <span style={{ color: 'var(--accent)', marginRight: 4 }}>↺</span>}
                                {t.title}
                              </button>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ width: 10, height: 10, borderRadius: 3, background: t.client.color || `oklch(70% 0.18 ${hueForId(t.client.id)})`, flexShrink: 0, display: 'inline-block' }} />
                                  <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{t.client.name}</span>
                                </span>
                                {t.dueDate && <span style={{ color: dueDateColor(t.dueDate, t.status), fontWeight: 500 }}>· 📅 {new Date(t.dueDate).toLocaleDateString('cs')}</span>}
                              </div>
                              {t.estimatedHours != null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtHours(logged)}/{fmtHours(t.estimatedHours)}h</span>
                                  <div className={`progress-bar${over ? ' over' : ''}`}><i style={{ width: `${pct * 100}%` }} /></div>
                                </div>
                              )}
                              {t.description && <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</div>}
                              <div style={{ display: 'flex', gap: 4, paddingTop: 8, borderTop: '1px solid var(--glass-border)' }}>
                                {colIdx > 0 && <button className="icon-btn" onClick={() => setStatus(t.id, COLS[colIdx - 1].id)}>←</button>}
                                {colIdx < 3 && <button className="icon-btn" onClick={() => setStatus(t.id, COLS[colIdx + 1].id)}>→</button>}
                                <button className="btn btn-accent btn-sm" style={{ marginLeft: 'auto' }} onClick={() => openLog(t)}>+ Hodiny</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>

                {/* Mobile grouped */}
                <div className="md:hidden" style={{ flexDirection: 'column', gap: 20 }}>
                  {COLS.map(col => {
                    const colTasks = filteredTasks.filter(t => t.status === col.id)
                    if (!colTasks.length) return null
                    return (
                      <div key={col.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span className={`status-dot ${col.dotClass}`} />
                          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>{col.label}</span>
                        </div>
                        {colTasks.map(t => {
                          const colIdx = COLS.findIndex(c => c.id === col.id)
                          const logged = t.timeEntries.reduce((s, e) => s + e.hours, 0)
                          const pct = t.estimatedHours ? Math.min(logged / t.estimatedHours, 1) : 0
                          const over = t.estimatedHours ? logged > t.estimatedHours : false
                          return (
                            <div key={t.id} className="glass-card" style={{ padding: 14, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <button style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick={() => openDetail(t)}>{t.title}</button>
                                <button className="btn btn-accent btn-sm" style={{ flexShrink: 0 }} onClick={() => openLog(t)}>+ Hodiny</button>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: 2, background: t.client.color || `oklch(70% 0.18 ${hueForId(t.client.id)})`, display: 'inline-block' }} />
                                  {t.client.name}
                                </span>
                                {t.dueDate && <span style={{ color: dueDateColor(t.dueDate, t.status) }}> · 📅 {new Date(t.dueDate).toLocaleDateString('cs')}</span>}
                              </div>
                              {t.estimatedHours != null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{fmtHours(logged)}/{fmtHours(t.estimatedHours)}h</span>
                                  <div className={`progress-bar${over ? ' over' : ''}`}><i style={{ width: `${pct * 100}%` }} /></div>
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 4 }}>
                                {colIdx > 0 && <button className="icon-btn" onClick={() => setStatus(t.id, COLS[colIdx - 1].id)}>↑</button>}
                                {colIdx < 3 && <button className="icon-btn" onClick={() => setStatus(t.id, COLS[colIdx + 1].id)}>↓</button>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {tab === 'hours' && (
              <div>
                <div style={{ display: 'flex', marginBottom: 16 }}>
                  <button className="btn btn-accent" onClick={openManual}>+ Přidat hodiny</button>
                </div>
                {filteredEntries.length === 0 ? (
                  <div className="glass" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Zatím žádné záznamy.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {sortedMonths.map(month => {
                      const monthEntries = entriesByMonth[month]
                      const monthTotal = monthEntries.reduce((s, e) => s + e.hours, 0)
                      return (
                        <div key={month}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>{monthLabel(month)}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{fmtHours(monthTotal)} hod</span>
                          </div>
                          <div className="glass" style={{ overflow: 'hidden' }}>
                            {monthEntries.map((e, i) => {
                              const c = e.task?.client ?? e.client
                              return (
                                <div key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', gap: 12, borderBottom: i < monthEntries.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-1)' }}>
                                      {e.task ? e.task.title : (e.notes || <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>Bez úkolu</span>)}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                      {c && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c.color || `oklch(70% 0.18 ${hueForId(c.id)})`, display: 'inline-block' }} />{c.name}</span>}
                                      {!e.task && <span style={{ fontStyle: 'italic', color: 'var(--ink-4)' }}>Bez úkolu</span>}
                                      <span>{new Date(e.date).toLocaleDateString('cs')}</span>
                                      {e.task && e.notes && <span style={{ color: 'var(--ink-4)' }}>{e.notes}</span>}
                                    </div>
                                  </div>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{e.hours} hod</span>
                                  <button className="icon-btn" style={{ color: 'oklch(60% 0.18 25)' }} onClick={() => delEntry(e.id)}>✕</button>
                                </div>
                              )
                            })}
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
      </div>

      {/* Detail modal */}
      {detailTask && (
        <div className="modal-overlay" onClick={() => setDetailTask(null)}>
          <div className="glass-strong" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, borderRadius: 24, display: 'flex', flexDirection: 'column', maxHeight: '85vh', animation: 'modalIn 0.22s ease' }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 6px', color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>{detailTask.title}</h2>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: detailTask.client.color || 'var(--ink-4)', display: 'inline-block' }} />
                      {detailTask.client.name}
                    </span>
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
                  <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{renderDescription(detailTask.description)}</div>
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
            <div style={{ padding: '16px 24px 20px', borderTop: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea className="input" rows={2} placeholder="Přidat komentář..." value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment() }} style={{ flex: 1, resize: 'none' }} />
                <button className="btn btn-accent" style={{ alignSelf: 'flex-end' }} onClick={submitComment}>Odeslat</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log hours modal */}
      {logModal && (
        <div className="modal-overlay" onClick={() => setLogModal(null)}>
          <div className="glass-strong modal-box" onClick={e => e.stopPropagation()} style={{ padding: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: 'var(--ink-1)' }}>Zaznamenat hodiny</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 20px' }}>{logModal.title}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="label">Počet hodin *</label><input className="input" type="number" min="0.25" step="0.25" value={logForm.hours} onChange={e => setLogForm(p => ({ ...p, hours: e.target.value }))} placeholder="1.5" /></div>
              <div><label className="label">Datum</label><input className="input" type="date" value={logForm.date} onChange={e => setLogForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div><label className="label">Poznámka</label><input className="input" value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} placeholder="Co jsi dělal/a..." /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setLogModal(null)}>Zrušit</button>
              <button className="btn btn-accent" onClick={submitLog}>Uložit</button>
            </div>
          </div>
        </div>
      )}

      {/* Manual hours modal */}
      {manualModal && (
        <div className="modal-overlay" onClick={() => setManualModal(false)}>
          <div className="glass-strong modal-box" onClick={e => e.stopPropagation()} style={{ padding: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: 'var(--ink-1)' }}>Přidat hodiny ručně</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 20px' }}>Zpětný záznam bez vazby na úkol</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="label">Počet hodin *</label><input className="input" type="number" min="0.25" step="0.25" value={manualForm.hours} onChange={e => setManualForm(p => ({ ...p, hours: e.target.value }))} placeholder="1.5" /></div>
              <div><label className="label">Datum</label><input className="input" type="date" value={manualForm.date} onChange={e => setManualForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div><label className="label">Klient</label>
                <select className="input" value={manualForm.clientId} onChange={e => setManualForm(p => ({ ...p, clientId: e.target.value }))}>
                  <option value="">Bez klienta</option>
                  {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="label">Poznámka</label><input className="input" value={manualForm.notes} onChange={e => setManualForm(p => ({ ...p, notes: e.target.value }))} placeholder="Co jsi dělal/a..." /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setManualModal(false)}>Zrušit</button>
              <button className="btn btn-accent" onClick={submitManual}>Uložit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
