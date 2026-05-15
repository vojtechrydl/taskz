import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const items: { id: string; status: string; position: number }[] = await req.json()
  await prisma.$transaction(
    items.map(item =>
      prisma.task.update({
        where: { id: item.id },
        data: { status: item.status as any, position: item.position },
      })
    )
  )
  return NextResponse.json({ ok: true })
}
