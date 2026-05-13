import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId') || undefined
  const employeeId = searchParams.get('employeeId') || undefined

  const entries = await prisma.timeEntry.findMany({
    where: {
      ...(taskId ? { taskId } : {}),
      ...(employeeId ? { employeeId } : {}),
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          client: { select: { id: true, name: true, color: true } },
        },
      },
      employee: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const body = await req.json()
  const entry = await prisma.timeEntry.create({
    data: {
      taskId: body.taskId,
      employeeId: body.employeeId,
      hours: parseFloat(body.hours),
      date: body.date ? new Date(body.date) : new Date(),
      notes: body.notes || null,
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          client: { select: { id: true, name: true, color: true } },
        },
      },
      employee: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
