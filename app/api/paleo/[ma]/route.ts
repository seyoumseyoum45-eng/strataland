import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Allowed Ma values — prevent path traversal
const ALLOWED_MA = new Set([0, 50, 100, 120, 250, 500, 750]);

export async function GET(
  _req: NextRequest,
  { params }: { params: { ma: string } }
) {
  const ma = Number(params.ma);

  if (!ALLOWED_MA.has(ma)) {
    return NextResponse.json({ error: `No paleo data for ${ma} Ma` }, { status: 404 });
  }

  try {
    const filePath = join(process.cwd(), 'public', 'data', 'paleo', `${ma}.geojson`);
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Content-Type': 'application/geo+json',
      },
    });
  } catch (err: any) {
    const msg = err?.code === 'ENOENT'
      ? `File not found: public/data/paleo/${ma}.geojson`
      : `Read error: ${err?.message}`;
    console.error('[api/paleo]', msg);
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
