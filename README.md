# STRATALAND — Critical Minerals Intelligence Platform
## Setup & Run Guide

### Quick start (no database required)

```bash
cd strataland-app
npm install
npm run dev
```

Open http://localhost:3000 — you will see:
- Real Carto Dark Matter world map tiles
- 25 real mineral deposit markers at exact coordinates
- Clickable markers with popup intelligence cards
- Right-side intelligence panel populated on marker click
- Live filter bar: mineral type, status, confidence, score range
- Search bar (deposit name, country, mineral, operator)
- Bottom KPI bar calculated from filtered data
- Sidebar navigation with mineral shortcuts

### The map uses:
- **Carto Dark Matter tiles** — real dark world basemap (no API key needed)
- **Natural Earth country outlines** — loaded from CDN (topojson)
- **EPSG:4326** — standard lat/lon coordinate system
- **Leaflet 1.9.4** — full zoom, pan, clustering
- **leaflet.markercluster** — auto-cluster overlapping markers

### To connect the PostgreSQL database:

1. Run the SQL migrations:
```bash
psql strataland -f ../schema/001_core_schema.sql
psql strataland -f ../schema/002_seed_data.sql
psql strataland -f ../schema/003_geometry_helpers.sql
```

2. Create `.env.local`:
```
PGHOST=localhost
PGPORT=5432
PGDATABASE=strataland
PGUSER=strataland_api
PGPASSWORD=your_password
USE_DB=true
```

3. In `src/app/api/deposits/route.ts`, swap the import:
```typescript
// Replace:
import { DEPOSITS } from '@/lib/localData';
// With:
import { getDeposits } from '@/lib/db';
```

### File structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Global Map page (main entry)
│   └── api/
│       ├── deposits/route.ts   # GET /api/deposits
│       ├── deposits/[id]/route.ts
│       ├── minerals/route.ts   # GET /api/minerals
│       └── kpis/route.ts       # GET /api/kpis
├── components/
│   ├── StratMap.tsx            # Leaflet map (real tiles + clustering)
│   ├── IntelPanel.tsx          # Right intelligence panel
│   └── Sidebar.tsx             # Left navigation
├── lib/
│   └── localData.ts            # 25 real deposits, KPI calculator
└── types.ts                    # Shared TypeScript types
```
