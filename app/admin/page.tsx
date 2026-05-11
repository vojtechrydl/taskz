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

  const statCards = stats
    ? [
        { label: 'Klienti', value: stats.totalClients, href: '/admin/clients', color: 'text-purple-700 bg-purple-50' },
        { label: 'Zaměstnanci', value: stats.totalEmployees, href: '/admin/employees', color: 'text-indigo-700 bg-indigo-50' },
        { label: 'Úkoly celkem', value: stats.totalTasks, href: '/admin/tasks', color: 'text-blue-700 bg-blue-50' },
        { label: 'Splněno', value: stats.doneTasks, href: '/admin/tasks', color: 'text-green-700 bg-green-50' },
        { label: 'Probíhá', value: stats.inProgressTasks, href: '/admin/tasks', color: 'text-amber-700 bg-amber-50' },
        { label: 'Čeká', value: stats.todoTasks, href: '/admin/tasks', color: 'text-gray-700 bg-gray-100' },
        { label: 'Celkem hodin', value: stats.totalHours.toFixed(1), href: '/admin/tasks', color: 'text-blue-700 bg-blue-50' },
      ]
    : []

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Přehled</h1>
      {!stats ? (
        <p className="text-gray-500">Načítám...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {statCards.map((c) => (
            <Link key={c.label} href={c.href} className="card p-5 hover:shadow-md transition-shadow">
              <div className={`text-3xl font-bold mb-1 ${c.color.split(' ')[0]}`}>{c.value}</div>
              <div className="text-sm text-gray-500">{c.label}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
