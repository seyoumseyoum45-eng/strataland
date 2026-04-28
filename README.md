# STRATALAND — Critical Minerals Intelligence Platform
## Architecture & Setup Guide v1.0

---

## Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Frontend      | Next.js 14 (App Router), TypeScript |
| Map           | Leaflet 1.9, OpenStreetMap tiles    |
| Boundaries    | Natural Earth GeoJSON (ne_110m)     |
| Clustering    | Leaflet.MarkerCluster               |
| Database      | PostgreSQL 15 + PostGIS 3.x         |
| API           | Next.js Route Handlers (REST)       |
| DB Client     | node-postgres (pg)                  |

---

## File Structure

```
strataland/
├── schema/
│   ├── 001_core_schema.sql        # All tables, enums, triggers, indexes
│   ├── 002_seed_data.sql          # 25 real deposits + minerals
│   └── 003_geometry_helpers.sql   # GeoJSON function, map view, geometry sync
│
├── api/
│   └── routes.ts                  # All API route handler logic
│
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── .env.example
    └── src/
        ├── types/index.ts          # Shared TypeScript types
        ├── lib/db.ts               # PostgreSQL client + query helpers
        └── components/
            ├── StratMap.tsx        # Leaflet map component (client-only)
            └── GlobalMapPage.tsx   # Full page with sidebar, KPIs, panel
```

---

## Database Setup

```bash
# 1. Create database
createdb strataland

# 2. Create application user (read-only for API)
psql strataland -c "
  CREATE ROLE strataland_api WITH LOGIN PASSWORD 'your_password';
  GRANT CONNECT ON DATABASE strataland TO strataland_api;
  GRANT USAGE ON SCHEMA public TO strataland_api;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO strataland_api;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO strataland_api;
"

# 3. Run migrations in order
psql strataland -f schema/001_core_schema.sql
psql strataland -f schema/002_seed_data.sql
psql strataland -f schema/003_geometry_helpers.sql

# 4. Verify
psql strataland -c "SELECT COUNT(*) FROM deposits;"
psql strataland -c "SELECT name, country, latitude, longitude, primary_mineral FROM deposits LIMIT 5;"
```

---

## Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your Postgres credentials

npm install
npm run dev
# → http://localhost:3000
```

### Next.js App Router file locations

Create these files in your Next.js project:

```
app/
├── page.tsx                          → renders GlobalMapPage
└── api/
    ├── deposits/
    │   ├── route.ts                  → GET /api/deposits
    │   ├── geojson/route.ts          → GET /api/deposits/geojson
    │   ├── near/route.ts             → GET /api/deposits/near
    │   └── [id]/route.ts             → GET /api/deposits/:id
    ├── minerals/route.ts             → GET /api/minerals
    ├── countries/route.ts            → GET /api/countries
    ├── paleo-regions/route.ts        → GET /api/paleo-regions
    └── kpis/route.ts                 → GET /api/kpis
```

Each `route.ts` file re-exports the corresponding handler from `api/routes.ts`.

Example `app/api/deposits/route.ts`:
```typescript
export { GET_deposits as GET } from '@/api/routes';
```

---

## API Reference

### `GET /api/deposits/geojson`
Returns a GeoJSON FeatureCollection for the Leaflet map layer.

**Query parameters:**

| Param       | Type              | Example                     |
|-------------|-------------------|-----------------------------|
| `minerals`  | comma-separated   | `Lithium,Copper`            |
| `statuses`  | comma-separated   | `producing,undeveloped`     |
| `min_opp`   | integer 0–100     | `70`                        |
| `max_diff`  | integer 0–100     | `60`                        |
| `confidence`| comma-separated   | `high,medium`               |
| `countries` | comma-separated   | `Australia,Chile`           |
| `bbox`      | `minLon,minLat,maxLon,maxLat` | `-80,-60,180,90` |

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [116.0747, -33.8536] },
      "properties": {
        "id": "uuid",
        "name": "Greenbushes Lithium Mine",
        "country": "Australia",
        "primary_mineral": "Lithium",
        "status": "producing",
        "opportunity_score": 92,
        "difficulty_score": 34,
        "data_confidence": "high",
        "mineral_color": "#10b981",
        "marker_size": "lg",
        "resource_size_label": "286Mt",
        ...
      }
    }
  ]
}
```

### `GET /api/deposits`
Paginated deposit list with full scoring fields.

### `GET /api/deposits/:id`
Full deposit detail including infrastructure, risk, and AI summary.

### `GET /api/deposits/near?lat=&lon=&radius_km=`
PostGIS `ST_DWithin` proximity search. Returns deposits sorted by distance.

### `GET /api/kpis`
Dashboard aggregate counts.

---

## Map Component Usage

```tsx
import dynamic from 'next/dynamic';
const StratMap = dynamic(() => import('@/components/StratMap'), { ssr: false });

// In your page:
const [geojson, setGeojson] = useState(null);

useEffect(() => {
  fetch('/api/deposits/geojson?min_opp=60')
    .then(r => r.json())
    .then(setGeojson);
}, []);

<StratMap
  geojson={geojson}
  selectedId={selectedId}
  onDepositSelect={(id) => setSelectedId(id)}
  theme="dark"
  center={[20, 10]}
  zoom={3}
/>
```

---

## Key PostGIS Queries

```sql
-- Viewport bounding box query (what the map fires on pan/zoom)
SELECT * FROM deposit_map_layer
WHERE (
  SELECT location FROM deposits d WHERE d.id = deposit_map_layer.id
) && ST_MakeEnvelope(-80, -60, 180, 90, 4326);

-- Deposits within 500km of a point
SELECT name, country, distance_km FROM (
  SELECT
    name, country,
    ROUND(ST_Distance(
      location::geography,
      ST_SetSRID(ST_MakePoint(116.0, -33.0), 4326)::geography
    ) / 1000) AS distance_km
  FROM deposits
  WHERE ST_DWithin(
    location::geography,
    ST_SetSRID(ST_MakePoint(116.0, -33.0), 4326)::geography,
    500000
  )
) sub ORDER BY distance_km;

-- Full GeoJSON FeatureCollection from DB
SELECT strataland_deposits_geojson(
  p_minerals => ARRAY['Lithium'],
  p_min_opp  => 70
);
```

---

## Graticule Grid

The `StratMap` component renders lat/lon grid lines natively in Leaflet
(no plugin required). Grid lines are drawn as `L.polyline` elements:

- **Latitude:** 90°N → 90°S at 30° intervals
- **Longitude:** 180°W → 180°E at 60° intervals
- **Equator** (0°): highlighted, labelled `EQUATOR`
- **Prime Meridian** (0°): highlighted, labelled `PRIME MERIDIAN`
- All degree labels rendered as `L.divIcon` to avoid DOM layering issues

---

## Natural Earth Boundaries

Boundaries are loaded at runtime from the Natural Earth GeoJSON CDN:
```
https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/
  geojson/ne_110m_admin_0_countries.geojson
```

This is ~250KB. For production, self-host in `public/geodata/` and update
`NATURAL_EARTH_URL` in `StratMap.tsx` to `/geodata/ne_110m_admin_0_countries.geojson`.

Alternative resolutions:
- `ne_110m_*` — world-scale (default, ~250KB)
- `ne_50m_*`  — regional zoom (~900KB)
- `ne_10m_*`  — detailed / sub-national (~8MB, load on demand)

---

## Adding More Deposits

Insert into the `deposits` table. The PostGIS trigger auto-populates `location`:

```sql
INSERT INTO deposits (
  name, country, latitude, longitude,
  primary_mineral, deposit_type, status,
  opportunity_score, difficulty_score, data_confidence
) VALUES (
  'My New Deposit', 'Namibia', -22.5594, 17.0832,
  'Uranium', 'Calcrete', 'exploration',
  68, 55, 'medium'
);
-- location GEOMETRY column is set automatically by trg_deposit_geometry
```
