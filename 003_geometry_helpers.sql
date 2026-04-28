-- =============================================================
-- STRATALAND — Migration 003: Geometry Sync & GeoJSON Helpers
-- Run after 001_core_schema.sql
-- =============================================================

-- Ensure all existing rows have PostGIS geometry populated
-- (the trigger handles new inserts; this catches any pre-trigger rows)
UPDATE deposits
SET location = ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)
WHERE location IS NULL
  AND latitude  IS NOT NULL
  AND longitude IS NOT NULL;

-- Verify spatial index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'deposits' AND indexname = 'idx_deposits_location'
  ) THEN
    CREATE INDEX idx_deposits_location ON deposits USING GIST(location);
    RAISE NOTICE 'Created GIST index on deposits.location';
  ELSE
    RAISE NOTICE 'GIST index already exists';
  END IF;
END $$;

-- =============================================================
-- Function: strataland_deposits_geojson(filters jsonb)
-- Returns a complete GeoJSON FeatureCollection from PostgreSQL
-- Useful for server-side rendering or direct psql queries
-- =============================================================
CREATE OR REPLACE FUNCTION strataland_deposits_geojson(
  p_minerals     text[]    DEFAULT NULL,
  p_statuses     text[]    DEFAULT NULL,
  p_min_opp      integer   DEFAULT 0,
  p_max_diff     integer   DEFAULT 100,
  p_bbox         float[]   DEFAULT NULL  -- [minLon, minLat, maxLon, maxLat]
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(d.location)::jsonb,
        'properties', jsonb_build_object(
          'id',                 d.id,
          'name',               d.name,
          'country',            d.country,
          'region',             d.region,
          'primary_mineral',    d.primary_mineral,
          'secondary_minerals', d.secondary_minerals,
          'deposit_type',       d.deposit_type,
          'status',             d.status::text,
          'opportunity_score',  d.opportunity_score,
          'difficulty_score',   d.difficulty_score,
          'underutilization_score', d.underutilization_score,
          'data_confidence',    d.data_confidence::text,
          'mineral_color',      COALESCE(m.display_color, '#64748b'),
          'source_count',       (SELECT COUNT(*)::int FROM sources s WHERE s.deposit_id = d.id),
          'flags',              d.flags,
          'resource_size_label',
            CASE
              WHEN d.resource_size_tonnes >= 1e9 THEN
                round((d.resource_size_tonnes / 1e9)::numeric, 1)::text || 'Bt'
              WHEN d.resource_size_tonnes >= 1e6 THEN
                round((d.resource_size_tonnes / 1e6)::numeric, 0)::text || 'Mt'
              ELSE 'Unknown'
            END,
          'marker_size',
            CASE
              WHEN d.resource_size_tonnes > 5e9  THEN 'xl'
              WHEN d.resource_size_tonnes > 1e9  THEN 'lg'
              WHEN d.resource_size_tonnes > 2e8  THEN 'md'
              ELSE 'sm'
            END
        )
      )
    ), '[]'::jsonb)
  )
  FROM deposits d
  LEFT JOIN minerals m ON d.primary_mineral = m.name
  WHERE
    (p_minerals  IS NULL OR d.primary_mineral = ANY(p_minerals))
    AND (p_statuses IS NULL OR d.status::text = ANY(p_statuses))
    AND (p_min_opp  IS NULL OR d.opportunity_score >= p_min_opp)
    AND (p_max_diff IS NULL OR d.difficulty_score  <= p_max_diff)
    AND (
      p_bbox IS NULL
      OR d.location && ST_MakeEnvelope(
            p_bbox[1], p_bbox[2], p_bbox[3], p_bbox[4], 4326
         )
    )
    AND d.location IS NOT NULL;
$$;

COMMENT ON FUNCTION strataland_deposits_geojson IS
  'Returns a PostGIS-native GeoJSON FeatureCollection for all matching deposits. '
  'Use for map tile generation, server-rendered exports, or API caching.';

-- Example usage:
-- SELECT strataland_deposits_geojson(
--   p_minerals => ARRAY['Lithium','Copper'],
--   p_min_opp  => 70
-- );

-- =============================================================
-- View: deposit_map_layer
-- Pre-joined view for fast map API queries
-- =============================================================
CREATE OR REPLACE VIEW deposit_map_layer AS
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
  d.status::text                          AS status,
  d.development_stage::text               AS development_stage,
  d.opportunity_score,
  d.difficulty_score,
  d.underutilization_score,
  d.infrastructure_score,
  d.country_risk_score,
  d.data_confidence::text                 AS data_confidence,
  d.flags,
  d.resource_size_tonnes::float,
  d.grade_percent::float,
  COALESCE(d.grade_unit, '%')             AS grade_unit,
  COALESCE(m.display_color, '#64748b')    AS mineral_color,
  COALESCE(m.iea_critical, false)         AS iea_critical,
  COALESCE(m.strategic_importance, 5)     AS strategic_importance,
  CASE
    WHEN d.resource_size_tonnes > 5e9  THEN 'xl'
    WHEN d.resource_size_tonnes > 1e9  THEN 'lg'
    WHEN d.resource_size_tonnes > 2e8  THEN 'md'
    ELSE 'sm'
  END                                     AS marker_size,
  ST_AsGeoJSON(d.location)::jsonb         AS geojson_point
FROM deposits d
LEFT JOIN minerals m ON d.primary_mineral = m.name
WHERE d.location IS NOT NULL;

COMMENT ON VIEW deposit_map_layer IS
  'Flattened view of deposits with mineral metadata, pre-computed marker sizes, '
  'and GeoJSON geometry for direct API consumption. No JOINs needed at query time.';

-- Spatial index on the view is inherited from the base table.
-- Query example using bounding box:
-- SELECT * FROM deposit_map_layer
-- WHERE geojson_point IS NOT NULL
--   AND (ST_AsGeoJSON(
--         ST_SetSRID(ST_MakePoint(
--           (geojson_point->'coordinates'->>0)::float,
--           (geojson_point->'coordinates'->>1)::float
--         ), 4326)
--       ))::jsonb IS NOT NULL;
-- (Use the base deposits table with PostGIS && for actual bbox queries)
