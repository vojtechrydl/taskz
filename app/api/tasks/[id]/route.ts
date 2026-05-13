import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description || null
  if (body.type !== undefined) data.type = body.type
  if (body.status !== undefined) {
    data.status = body.status
    data.completedAt = body.status === 'DONE' ? new Date() : null
  }
  if (body.clientId !== undefined) data.clientId = body.clientId
  if (body.employeeId !== undefined) data.employeeId = body.employeeId || null
  if (body.estimatedHours !== undefined)
    data.estimatedHours = body.estimatedHours ? parseFloat(body.estimatedHours) : null
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null

  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      client: { select: { id: true, name: true, color: true } },
      employee: { select: { id: true, name: true } },
      timeEntries: { select: { hours: true } },
    },
  })
  return NextResponse.json(task)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.task.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
