import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.timeEntry.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
