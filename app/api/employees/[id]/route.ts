import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const employee = await prisma.employee.update({
    where: { id: params.id },
    data: { name: body.name, email: body.email || null },
  })
  return NextResponse.json(employee)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.employee.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
