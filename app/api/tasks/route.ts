import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TaskStatus, TaskType } from '@prisma/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId') || undefined
  const employeeId = searchParams.get('employeeId') || undefined
  const status = searchParams.get('status') as TaskStatus | null
  const type = searchParams.get('type') as TaskType | null

  const tasks = await prisma.task.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    },
    include: {
      client: { select: { id: true, name: true, color: true } },
      employee: { select: { id: true, name: true } },
      timeEntries: { select: { hours: true } },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const body = await req.json()
  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description || null,
      type: body.type || 'ONE_TIME',
      status: 'TODO',
      clientId: body.clientId,
      employeeId: body.employeeId || null,
      estimatedHours: body.estimatedHours ? parseFloat(body.estimatedHours) : null,
      dueDate: body.dueDate ? (() => { const [y,m,d] = body.dueDate.split('-').map(Number); return new Date(y, m-1, d, 12, 0, 0) })() : null,
    },
    include: {
      client: { select: { id: true, name: true, color: true } },
      employee: { select: { id: true, name: true } },
      timeEntries: { select: { hours: true } },
    },
  })
  return NextResponse.json(task, { status: 201 })
}
