import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(employees)
}

export async function POST(req: Request) {
  const body = await req.json()
  const employee = await prisma.employee.create({
    data: { name: body.name, email: body.email || null },
  })
  return NextResponse.json(employee, { status: 201 })
}
