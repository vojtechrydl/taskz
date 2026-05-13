import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comments = await prisma.comment.findMany({
    where: { taskId: id },
    include: { employee: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const comment = await prisma.comment.create({
    data: { taskId: id, employeeId: body.employeeId, text: body.text },
    include: { employee: { select: { id: true, name: true } } },
  })
  return NextResponse.json(comment, { status: 201 })
}
