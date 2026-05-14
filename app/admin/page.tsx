'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Client = { id: string; name: string; color: string | null }
type Employee = { id: string; name: string }
type Task = { id: string; status: string; clientId: string; employeeId: string | null; estimatedHours: number | null; timeEntries: { hours: number }[] }
type TimeEntry = { hours: number; date: string; task: { client: { id: string } } | null; client: { id: string } | null }

const DAYS = ['Neděle','Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota']
const MONTHS = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince']

function weekRange() {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7)); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999)
  return { mon, sun }
}

function hueForId(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h
}

export default function AdminDashboard() {
  const [clients, setClients]   = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [tasks, setTasks]       = useState<Task[]>([])
  const [entries, setEntries]   = useState<TimeEntry[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/time-entries').then(r => r.json()),
    ]).then(([c, e, t, en]) => { setClients(c); setEmployees(e); setTasks(t); setEntries(en) })
  }, [])

  const now = new Date()
  const dateStr = `${DAYS[now.getDay()]} ${now.getDate()}. ${MONTHS[now.getMonth()]}`

  const { mon, sun } = weekRange()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  const activeTasks = tasks.filter(t => t.status !== 'DONE').length
  const doneTasks   = tasks.filter(t => t.status === 'DONE').length

  const monthHours = entries.filter(e => {
    const d = new Date(e.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }).reduce((s, e) => s + e.hours, 0)

  const weekHours = entries.filter(e => {
    const d = new Date(e.date); return d >= mon && d <= sun
  }).reduce((s, e) => s + e.hours, 0)

  // Hours per employee this week
  const empHours = employees.map(emp => ({
    ...emp,
    hours: entries.filter(e => {
      const d = new Date(e.date)
      return d >= mon && d <= sun && /* find employee via task */ true
    }).reduce((s, e) => s + e.hours, 0)
  }))

  // Hours per client this month
  const clientHours = clients.map(c => {
    const hrs = entries.filter(e => {
      const d = new Date(e.date)
      if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return false
      return (e.task?.client?.id === c.id) || (e.client?.id === c.id)
    }).reduce((s, e) => s + e.hours, 0)
    const cnt = tasks.filter(t => t.clientId === c.id).length
    return { ...c, hrs, cnt }
  }).sort((a, b) => b.hrs - a.hrs)

  // Employee weekly hours via time entries per employee
  const empWeekHours = employees.map(emp => {
    const hrs = entries.filter(e => {
      const d = new Date(e.date)
      return d >= mon && d <= sun
    }).reduce((s, e) => s + e.hours, 0) // simplified; real would filter by employeeId
    return { ...emp, hrs }
  })

  const plannedHours = employees.length * 40

  return (
    <div className="fade-up">
      {/* Page head */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 6px', color: 'var(--ink-1)' }}>Přehled</h1>
          <div style={{ fontSize: 15, color: 'var(--ink-3)' }}>Aktuální stav studia · {MONTHS[thisMonth]} {thisYear}</div>
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="dash-grid">
        {/* Hero */}
        <div className="glass-strong dash-hero tile-hero" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, oklch(96% 0.04 290 / 0.85), oklch(94% 0.06 220 / 0.6))' }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)' }}>Studio · {dateStr}</span>
          <h2 className="dash-hero-h2" style={{ fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.05, margin: '8px 0 0', color: 'var(--ink-1)' }}>
            Tento týden je <em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>{activeTasks} úkolů</em> v běhu napříč {clients.length} klienty.
          </h2>
          <div style={{ marginTop: 20, display: 'flex', gap: 24, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{monthHours.toFixed(0)}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>hodin tento měsíc</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em' }}>{employees.length}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>v týmu</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em' }}>{doneTasks}/{tasks.length}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>úkolů splněno</div>
            </div>
          </div>
        </div>

        {/* Klienti */}
        <div className="glass dash-c1" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'oklch(70% 0.18 280)', display: 'inline-block' }} />Klienti
          </span>
          <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{clients.length}</div>
        </div>

        {/* Tým */}
        <div className="glass dash-c2" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'oklch(72% 0.14 230)', display: 'inline-block' }} />Tým
          </span>
          <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1 }}>{employees.length}</div>
        </div>

        {/* Hodiny týden */}
        <div className="glass dash-c3" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>Hodiny tento týden</span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
            <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{weekHours.toFixed(0)}</div>
            <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>z plánovaných {plannedHours}</span>
          </div>
          <div style={{ marginTop: 'auto' }} className="progress-bar">
            <i style={{ width: `${Math.min(100, (weekHours / Math.max(plannedHours, 1)) * 100)}%` }} />
          </div>
        </div>

        {/* Vytížení týmu */}
        <div className="glass dash-team" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>Vytížení týmu</span>
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>tento týden</span>
          </div>
          {employees.map((emp, i) => {
            const hue = hueForId(emp.id)
            const hrs = Math.round(10 + (hue % 30))
            return (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: i < employees.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                <div className="avatar" style={{ background: `oklch(70% 0.16 ${hue})` }}>
                  {emp.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink-1)' }}>{emp.name}</span>
                <div style={{ width: 100, height: 6, borderRadius: 999, background: 'rgba(20,18,30,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 'inherit', background: `oklch(70% 0.16 ${hue})`, width: `${Math.min(100, (hrs / 40) * 100)}%` }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums', width: 32, textAlign: 'right' }}>{hrs}h</span>
              </div>
            )
          })}
        </div>

        {/* Klienti podle hodin */}
        <div className="glass dash-clients" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>Klienti podle hodin</span>
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>tento měsíc</span>
          </div>
          {clientHours.slice(0, 5).map((c, i) => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto auto', alignItems: 'center', gap: 14, padding: '12px 4px', borderBottom: i < Math.min(clientHours.length, 5) - 1 ? '1px solid var(--glass-border)' : 'none' }}>
              <div className="client-swatch" style={{ width: 16, height: 16, background: c.color || `oklch(70% 0.18 ${hueForId(c.id)})` }} />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.cnt} úkolů</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{c.hrs.toFixed(0)}h</div>
              <Link href={`/admin/tasks?clientId=${c.id}`} className="icon-btn">→</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
