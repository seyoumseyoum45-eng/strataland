// =============================================================
// STRATALAND — API Routes (Next.js App Router)
//
// File layout (Next.js 14 App Router):
//   app/api/deposits/route.ts          → GET /api/deposits
//   app/api/deposits/[id]/route.ts     → GET /api/deposits/:id
//   app/api/deposits/geojson/route.ts  → GET /api/deposits/geojson
//   app/api/deposits/near/route.ts     → GET /api/deposits/near
//   app/api/minerals/route.ts          → GET /api/minerals
//   app/api/kpis/route.ts              → GET /api/kpis
//
// All routes are read-only (GET). Auth, mutations, and admin
// endpoints are out of scope for the MVP intelligence platform.
// =============================================================

// ─────────────────────────────────────────────────────────────
// app/api/deposits/route.ts
// GET /api/deposits
// Query params:
//   minerals      comma-separated  e.g. Lithium,Copper
//   statuses      comma-separated  e.g. producing,undeveloped
//   min_opp       integer 0–100
//   max_diff      integer 0–100
//   confidence    comma-separated  high,medium,low
//   countries     comma-separated  e.g. Australia,Chile
//   bbox          minLon,minLat,maxLon,maxLat
//   page          integer (default 1)
//   per_page      integer (default 500, max 2000)
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import {
  getDeposits,
  getDepositsGeoJSON,
  getDepositById,
  getDepositsNear,
  getDashboardKPIs,
  query,
} from '@/db';
import type { MapFilters } from '@/types';

// Shared CORS + cache headers
const BASE_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function cacheHeaders(maxAge = 60) {
  return {
    ...BASE_HEADERS,
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=300`,
  };
}

function errorResponse(message: string, code: string, status = 500) {
  return NextResponse.json(
    { error: message, code },
    { status, headers: BASE_HEADERS }
  );
}

function parseFilters(req: NextRequest): Partial<MapFilters> {
  const sp = req.nextUrl.searchParams;
  const filters: Partial<MapFilters> = {};

  const minerals = sp.get('minerals');
  if (minerals) filters.minerals = minerals.split(',').map((s) => s.trim());

  const statuses = sp.get('statuses');
  if (statuses) filters.statuses = statuses.split(',').map((s) => s.trim()) as any;

  const minOpp = sp.get('min_opp');
  if (minOpp) filters.min_opportunity = Math.max(0, Math.min(100, parseInt(minOpp)));

  const maxDiff = sp.get('max_diff');
  if (maxDiff) filters.max_difficulty = Math.max(0, Math.min(100, parseInt(maxDiff)));

  const confidence = sp.get('confidence');
  if (confidence) filters.data_confidence = confidence.split(',').map((s) => s.trim()) as any;

  const countries = sp.get('countries');
  if (countries) filters.countries = countries.split(',').map((s) => s.trim());

  const bbox = sp.get('bbox');
  if (bbox) {
    const parts = bbox.split(',').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      filters.bbox = parts as [number, number, number, number];
    }
  }

  return filters;
}

// ─────────────────────────────────────────────────────────────
// GET /api/deposits
// ─────────────────────────────────────────────────────────────
export async function GET_deposits(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page    = Math.max(1, parseInt(sp.get('page') || '1'));
    const perPage = Math.min(2000, Math.max(1, parseInt(sp.get('per_page') || '500')));
    const filters = parseFilters(req);

    const { rows, total } = await getDeposits(filters, page, perPage);

    return NextResponse.json(
      {
        data: rows,
        meta: {
          total,
          page,
          per_page: perPage,
          pages: Math.ceil(total / perPage),
          generated_at: new Date().toISOString(),
          filters_applied: Object.keys(filters).length,
        },
      },
      { headers: cacheHeaders(30) }
    );
  } catch (err: any) {
    console.error('[GET /api/deposits]', err);
    return errorResponse('Failed to fetch deposits', 'DB_ERROR');
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/deposits/geojson
// Returns FeatureCollection for Leaflet / map layer
// Cached aggressively — map tiles don't need real-time data
// ─────────────────────────────────────────────────────────────
export async function GET_deposits_geojson(req: NextRequest) {
  try {
    const filters = parseFilters(req);
    const geojson = await getDepositsGeoJSON(filters);

    return NextResponse.json(geojson, {
      headers: {
        ...cacheHeaders(120),
        'Content-Type': 'application/geo+json',
      },
    });
  } catch (err: any) {
    console.error('[GET /api/deposits/geojson]', err);
    return errorResponse('Failed to generate GeoJSON', 'GEOJSON_ERROR');
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/deposits/[id]
// Full deposit detail page
// ─────────────────────────────────────────────────────────────
export async function GET_deposit_by_id(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Basic UUID validation
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    return errorResponse('Invalid deposit ID format', 'INVALID_ID', 400);
  }

  try {
    const deposit = await getDepositById(id);
    if (!deposit) {
      return errorResponse('Deposit not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json(
      { data: deposit, meta: { generated_at: new Date().toISOString() } },
      { headers: cacheHeaders(60) }
    );
  } catch (err: any) {
    console.error(`[GET /api/deposits/${id}]`, err);
    return errorResponse('Failed to fetch deposit', 'DB_ERROR');
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/deposits/near
// Spatial proximity query using PostGIS ST_DWithin
// Query params: lat, lon, radius_km (default 500), limit (default 10)
// ─────────────────────────────────────────────────────────────
export async function GET_deposits_near(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat      = parseFloat(sp.get('lat') || '');
  const lon      = parseFloat(sp.get('lon') || '');
  const radiusKm = parseFloat(sp.get('radius_km') || '500');
  const limit    = Math.min(50, parseInt(sp.get('limit') || '10'));

  if (isNaN(lat) || isNaN(lon)) {
    return errorResponse('lat and lon are required numeric parameters', 'MISSING_PARAMS', 400);
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return errorResponse('lat/lon out of valid range', 'INVALID_COORDS', 400);
  }

  try {
    const rows = await getDepositsNear(lat, lon, radiusKm, limit);
    return NextResponse.json(
      {
        data: rows,
        meta: {
          query: { lat, lon, radius_km: radiusKm },
          count: rows.length,
          generated_at: new Date().toISOString(),
        },
      },
      { headers: cacheHeaders(60) }
    );
  } catch (err: any) {
    console.error('[GET /api/deposits/near]', err);
    return errorResponse('Spatial query failed', 'SPATIAL_ERROR');
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/minerals
// ─────────────────────────────────────────────────────────────
export async function GET_minerals(req: NextRequest) {
  try {
    const result = await query(`
      SELECT
        id, symbol, name, category::text, atomic_number,
        iea_critical, eu_critical, us_critical,
        strategic_importance, typical_grade_unit,
        primary_use, ev_relevance, energy_transition_use,
        display_color
      FROM minerals
      ORDER BY strategic_importance DESC, name ASC
    `);
    return NextResponse.json(
      { data: result.rows, meta: { total: result.rowCount, generated_at: new Date().toISOString() } },
      { headers: cacheHeaders(3600) }
    );
  } catch (err: any) {
    console.error('[GET /api/minerals]', err);
    return errorResponse('Failed to fetch minerals', 'DB_ERROR');
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/countries
// ─────────────────────────────────────────────────────────────
export async function GET_countries(req: NextRequest) {
  try {
    const result = await query(`
      SELECT
        id, iso_alpha2, iso_alpha3, name, region, sub_region,
        political_stability_score, rule_of_law_score,
        corruption_perception_index, mining_jurisdiction_score,
        royalty_regime, permitting_complexity,
        country_risk_composite, mining_gdp_percent,
        ST_AsGeoJSON(centroid)::jsonb AS centroid_geojson
      FROM countries
      ORDER BY name ASC
    `);
    return NextResponse.json(
      { data: result.rows, meta: { total: result.rowCount, generated_at: new Date().toISOString() } },
      { headers: cacheHeaders(3600) }
    );
  } catch (err: any) {
    console.error('[GET /api/countries]', err);
    return errorResponse('Failed to fetch countries', 'DB_ERROR');
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/paleo-regions
// ─────────────────────────────────────────────────────────────
export async function GET_paleo_regions(req: NextRequest) {
  try {
    const result = await query(`
      SELECT
        id, name, paleo_environment::text, age_ma_min::float, age_ma_max::float,
        geological_era, countries, known_mineral_systems,
        exploration_potential, description, certainty_note,
        ST_AsGeoJSON(geometry)::jsonb AS geojson
      FROM paleo_regions
      ORDER BY exploration_potential DESC, name ASC
    `);
    return NextResponse.json(
      { data: result.rows, meta: { total: result.rowCount, generated_at: new Date().toISOString() } },
      { headers: cacheHeaders(3600) }
    );
  } catch (err: any) {
    console.error('[GET /api/paleo-regions]', err);
    return errorResponse('Failed to fetch paleo regions', 'DB_ERROR');
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/kpis
// Dashboard aggregate stats
// ─────────────────────────────────────────────────────────────
export async function GET_kpis(req: NextRequest) {
  try {
    const kpis = await getDashboardKPIs();
    return NextResponse.json(
      { data: kpis, meta: { generated_at: new Date().toISOString() } },
      { headers: cacheHeaders(120) }
    );
  } catch (err: any) {
    console.error('[GET /api/kpis]', err);
    return errorResponse('Failed to fetch KPIs', 'DB_ERROR');
  }
}
