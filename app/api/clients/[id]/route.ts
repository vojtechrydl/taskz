import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const client = await prisma.client.update({
    where: { id: params.id },
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      notes: body.notes || null,
    },
  })
  return NextResponse.json(client)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.client.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
