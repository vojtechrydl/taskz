import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const employee = await prisma.employee.update({
    where: { id },
    data: { name: body.name, email: body.email || null },
  })
  return NextResponse.json(employee)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.employee.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
