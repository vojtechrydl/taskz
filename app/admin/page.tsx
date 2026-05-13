'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Stats = {
  totalClients: number
  totalEmployees: number
  totalTasks: number
  doneTasks: number
  inProgressTasks: number
  todoTasks: number
  totalHours: number
}

const statCards = (stats: Stats) => [
  { label: 'Klienti', value: stats.totalClients, href: '/admin/clients', dot: 'bg-violet-400' },
  { label: 'Zaměstnanci', value: stats.totalEmployees, href: '/admin/employees', dot: 'bg-indigo-400' },
  { label: 'Úkoly celkem', value: stats.totalTasks, href: '/admin/tasks', dot: 'bg-sky-400' },
  { label: 'Splněno', value: stats.doneTasks, href: '/admin/tasks', dot: 'bg-emerald-400' },
  { label: 'Probíhá', value: stats.inProgressTasks, href: '/admin/tasks', dot: 'bg-amber-400' },
  { label: 'Čeká', value: stats.todoTasks, href: '/admin/tasks', dot: 'bg-[#8B9099]' },
  { label: 'Celkem hodin', value: stats.totalHours.toFixed(1), href: '/admin/tasks', dot: 'bg-violet-400' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then((r) => r.json()),
      fetch('/api/employees').then((r) => r.json()),
      fetch('/api/tasks').then((r) => r.json()),
      fetch('/api/time-entries').then((r) => r.json()),
    ]).then(([clients, employees, tasks, entries]) => {
      setStats({
        totalClients: clients.length,
        totalEmployees: employees.length,
        totalTasks: tasks.length,
        doneTasks: tasks.filter((t: { status: string }) => t.status === 'DONE').length,
        inProgressTasks: tasks.filter((t: { status: string }) => t.status === 'IN_PROGRESS').length,
        todoTasks: tasks.filter((t: { status: string }) => t.status === 'TODO').length,
        totalHours: entries.reduce((s: number, e: { hours: number }) => s + e.hours, 0),
      })
    })
  }, [])

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Přehled</h1>
      <p className="text-sm text-[#8B9099] mb-6">Souhrn všech aktivit</p>
      {!stats ? (
        <p className="text-[#8B9099] text-sm">Načítám...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
          {statCards(stats).map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="card p-5 hover:border-[#3A3D40] hover:bg-[#1A1C1E] transition-colors group"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                <span className="text-xs text-[#8B9099] font-medium uppercase tracking-wide">{c.label}</span>
              </div>
              <div className="text-3xl font-bold text-white">{c.value}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
