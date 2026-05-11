import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { tasks: true } } },
  })
  return NextResponse.json(clients)
}

export async function POST(req: Request) {
  const body = await req.json()
  const client = await prisma.client.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      notes: body.notes || null,
    },
  })
  return NextResponse.json(client, { status: 201 })
}
