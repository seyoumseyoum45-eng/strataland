// src/app/api/kpis/route.ts
import { NextResponse } from 'next/server';
import { DEPOSITS, computeKPIs } from '@/lib/localData';
export async function GET() {
  return NextResponse.json({ data: computeKPIs(DEPOSITS) });
}
