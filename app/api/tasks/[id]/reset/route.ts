import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const task = await prisma.task.update({
    where: { id: params.id },
    data: { status: 'TODO', completedAt: null },
    include: {
      client: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
      timeEntries: { select: { hours: true } },
    },
  })
  return NextResponse.json(task)
}
