import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const task = await prisma.task.update({
    where: { id },
    data: { status: 'TODO', completedAt: null },
    include: {
      client: { select: { id: true, name: true, color: true } },
      employee: { select: { id: true, name: true } },
      timeEntries: { select: { hours: true } },
    },
  })
  return NextResponse.json(task)
}
