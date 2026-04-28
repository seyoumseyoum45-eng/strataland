// =============================================================
// STRATALAND — Database Client
// PostgreSQL + PostGIS via pg (node-postgres)
// =============================================================

import { Pool, PoolClient, QueryResult } from 'pg';
import type { MapFilters, DepositSummary, DepositDetail, DepositGeoJSON } from '../types';

// ── Connection pool ───────────────────────────────────────────
const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'strataland',
  user:     process.env.PGUSER     || 'strataland_api',
  password: process.env.PGPASSWORD || '',
  max:      20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : false,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error', err);
});

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return pool.query<T>(sql, params);
}

// ── Deposit queries ───────────────────────────────────────────

/**
 * Returns deposit summary rows matching the given filters.
 * Supports bounding-box spatial filtering via PostGIS &&
 */
export async function getDeposits(
  filters: Partial<MapFilters> = {},
  page = 1,
  perPage = 500
): Promise<{ rows: DepositSummary[]; total: number }> {
  const conditions: string[] = [];
  const params: any[] = [];
  let p = 1;

  if (filters.minerals?.length) {
    conditions.push(`d.primary_mineral = ANY($${p}::text[])`);
    params.push(filters.minerals);
    p++;
  }

  if (filters.statuses?.length) {
    conditions.push(`d.status = ANY($${p}::deposit_status[])`);
    params.push(filters.statuses);
    p++;
  }

  if (filters.min_opportunity != null) {
    conditions.push(`d.opportunity_score >= $${p}`);
    params.push(filters.min_opportunity);
    p++;
  }

  if (filters.max_difficulty != null) {
    conditions.push(`d.difficulty_score <= $${p}`);
    params.push(filters.max_difficulty);
    p++;
  }

  if (filters.data_confidence?.length) {
    conditions.push(`d.data_confidence = ANY($${p}::data_confidence_level[])`);
    params.push(filters.data_confidence);
    p++;
  }

  if (filters.countries?.length) {
    conditions.push(`d.country = ANY($${p}::text[])`);
    params.push(filters.countries);
    p++;
  }

  // PostGIS bounding box filter — critical for viewport-based map queries
  if (filters.bbox) {
    const [minLon, minLat, maxLon, maxLat] = filters.bbox;
    conditions.push(
      `d.location && ST_MakeEnvelope($${p}, $${p+1}, $${p+2}, $${p+3}, 4326)`
    );
    params.push(minLon, minLat, maxLon, maxLat);
    p += 4;
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const offset = (page - 1) * perPage;
  params.push(perPage, offset);

  const sql = `
    SELECT
      d.id,
      d.name,
      d.country,
      d.region,
      d.latitude::float,
      d.longitude::float,
      d.primary_mineral,
      d.secondary_minerals,
      d.deposit_type,
      d.status::text,
      d.development_stage::text,
      d.resource_size_tonnes::float,
      d.grade_percent::float,
      COALESCE(d.grade_unit, '%') AS grade_unit,
      d.owner,
      d.operator,
      d.opportunity_score,
      d.difficulty_score,
      d.underutilization_score,
      d.infrastructure_score,
      d.country_risk_score,
      d.environmental_risk_score,
      d.data_confidence::text,
      d.ai_summary,
      d.flags,
      d.last_updated,
      COALESCE(m.display_color, '#64748b') AS mineral_color,
      COALESCE(m.iea_critical, false)      AS iea_critical,
      COALESCE(m.strategic_importance, 5)  AS strategic_importance,
      (
        SELECT COUNT(*)::int FROM sources s WHERE s.deposit_id = d.id
      ) AS source_count
    FROM deposits d
    LEFT JOIN minerals m ON d.primary_mineral = m.name
    ${where}
    ORDER BY d.opportunity_score DESC NULLS LAST
    LIMIT $${p} OFFSET $${p+1}
  `;

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM deposits d
    ${where}
  `;

  const [dataResult, countResult] = await Promise.all([
    query<DepositSummary>(sql, params),
    query<{ total: number }>(countSql, params.slice(0, p - 1)),
  ]);

  return {
    rows: dataResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
}

/**
 * Returns a GeoJSON FeatureCollection of deposits for the map layer.
 * Uses PostGIS ST_AsGeoJSON for geometry serialisation.
 */
export async function getDepositsGeoJSON(
  filters: Partial<MapFilters> = {}
): Promise<DepositGeoJSON> {
  const { rows } = await getDeposits(filters, 1, 5000);

  const features = rows.map((d) => {
    // Marker size based on resource size
    let marker_size: 'sm' | 'md' | 'lg' | 'xl' = 'sm';
    if (d.resource_size_tonnes) {
      if (d.resource_size_tonnes > 5_000_000_000) marker_size = 'xl';
      else if (d.resource_size_tonnes > 1_000_000_000) marker_size = 'lg';
      else if (d.resource_size_tonnes > 200_000_000)  marker_size = 'md';
    }

    const resource_size_label = d.resource_size_tonnes
      ? d.resource_size_tonnes >= 1e9
        ? `${(d.resource_size_tonnes / 1e9).toFixed(1)}Bt`
        : `${(d.resource_size_tonnes / 1e6).toFixed(0)}Mt`
      : 'Unknown';

    const grade_label = d.grade_percent
      ? `${d.grade_percent}${d.grade_unit}`
      : 'Unknown';

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [d.longitude, d.latitude] as [number, number],
      },
      properties: {
        id: d.id,
        name: d.name,
        country: d.country,
        region: d.region,
        primary_mineral: d.primary_mineral,
        secondary_minerals: d.secondary_minerals,
        deposit_type: d.deposit_type,
        status: d.status,
        opportunity_score: d.opportunity_score,
        difficulty_score: d.difficulty_score,
        underutilization_score: d.underutilization_score,
        data_confidence: d.data_confidence,
        mineral_color: d.mineral_color,
        source_count: d.source_count,
        flags: d.flags,
        resource_size_label,
        grade_label,
        marker_size,
      },
    };
  });

  return { type: 'FeatureCollection', features };
}

/**
 * Returns a single deposit with all fields.
 */
export async function getDepositById(id: string): Promise<DepositDetail | null> {
  const sql = `
    SELECT
      d.*,
      d.status::text,
      d.development_stage::text,
      d.data_confidence::text,
      d.latitude::float,
      d.longitude::float,
      d.resource_size_tonnes::float,
      d.reserve_size_tonnes::float,
      d.grade_percent::float,
      d.contained_metal_tonnes::float,
      COALESCE(m.display_color, '#64748b') AS mineral_color,
      m.iea_critical,
      m.strategic_importance,
      c.political_stability_score,
      c.mining_jurisdiction_score,
      (SELECT COUNT(*)::int FROM sources s WHERE s.deposit_id = d.id) AS source_count
    FROM deposits d
    LEFT JOIN minerals m ON d.primary_mineral = m.name
    LEFT JOIN countries c ON d.country_id = c.id
    WHERE d.id = $1
  `;
  const result = await query<DepositDetail>(sql, [id]);
  return result.rows[0] ?? null;
}

/**
 * Spatial query: deposits within radius of a lat/lon point (km).
 */
export async function getDepositsNear(
  lat: number,
  lon: number,
  radiusKm: number,
  limit = 20
): Promise<Array<DepositSummary & { distance_km: number }>> {
  const sql = `
    SELECT
      d.id, d.name, d.country, d.primary_mineral, d.status::text,
      d.opportunity_score, d.difficulty_score, d.data_confidence::text,
      d.latitude::float, d.longitude::float,
      COALESCE(m.display_color, '#64748b') AS mineral_color,
      ROUND(
        ST_Distance(
          d.location::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) / 1000
      )::int AS distance_km
    FROM deposits d
    LEFT JOIN minerals m ON d.primary_mineral = m.name
    WHERE ST_DWithin(
      d.location::geography,
      ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
      $3 * 1000
    )
    ORDER BY distance_km ASC
    LIMIT $4
  `;
  const result = await query(sql, [lat, lon, radiusKm, limit]);
  return result.rows;
}

/**
 * Aggregate KPIs for the bottom status bar.
 */
export async function getDashboardKPIs(): Promise<{
  total_deposits: number;
  producing: number;
  undeveloped: number;
  countries_covered: number;
  minerals_covered: number;
  high_opportunity: number;
  high_confidence: number;
}> {
  const sql = `
    SELECT
      COUNT(*)::int                                              AS total_deposits,
      COUNT(*) FILTER (WHERE status = 'producing')::int         AS producing,
      COUNT(*) FILTER (WHERE status IN ('undeveloped','exploration','feasibility'))::int AS undeveloped,
      COUNT(DISTINCT country)::int                              AS countries_covered,
      COUNT(DISTINCT primary_mineral)::int                      AS minerals_covered,
      COUNT(*) FILTER (WHERE opportunity_score >= 75)::int      AS high_opportunity,
      COUNT(*) FILTER (WHERE data_confidence = 'high')::int     AS high_confidence
    FROM deposits
  `;
  const result = await query(sql);
  return result.rows[0];
}

export default pool;
