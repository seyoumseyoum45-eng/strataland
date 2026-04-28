// src/app/api/deposits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DEPOSITS } from '@/lib/localData';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  let data = [...DEPOSITS];

  const minerals = sp.get('minerals');
  if (minerals) {
    const list = minerals.split(',').map(s => s.trim().toLowerCase());
    data = data.filter(d => list.includes(d.primary_mineral.toLowerCase()));
  }
  const statuses = sp.get('statuses');
  if (statuses) {
    const list = statuses.split(',').map(s => s.trim());
    data = data.filter(d => list.includes(d.status));
  }
  const minOpp = sp.get('min_opp');
  if (minOpp) data = data.filter(d => d.opportunity_score >= parseInt(minOpp));
  const maxDiff = sp.get('max_diff');
  if (maxDiff) data = data.filter(d => d.difficulty_score <= parseInt(maxDiff));
  const q = sp.get('q');
  if (q) {
    const lq = q.toLowerCase();
    data = data.filter(d =>
      d.name.toLowerCase().includes(lq) ||
      d.country.toLowerCase().includes(lq) ||
      d.primary_mineral.toLowerCase().includes(lq) ||
      (d.operator || '').toLowerCase().includes(lq) ||
      (d.region || '').toLowerCase().includes(lq)
    );
  }
  const sort = sp.get('sort') || 'opportunity_score';
  data.sort((a: any, b: any) => (b[sort] ?? 0) - (a[sort] ?? 0));

  return NextResponse.json({ data, meta: { total: data.length, generated_at: new Date().toISOString() } });
}
