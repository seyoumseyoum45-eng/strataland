-- =============================================================
-- STRATALAND GLOBAL MINERAL INTELLIGENCE PLATFORM
-- Core Database Schema v1.0
-- PostgreSQL 15+ with PostGIS 3.x
-- =============================================================

-- Enable PostGIS and UUID generation
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for fuzzy text search

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE deposit_status AS ENUM (
  'producing',
  'past_producing',
  'undeveloped',
  'exploration',
  'feasibility',
  'construction',
  'care_and_maintenance',
  'unknown'
);

CREATE TYPE development_stage_type AS ENUM (
  'grassroots',
  'early_exploration',
  'advanced_exploration',
  'pre_feasibility',
  'feasibility',
  'permitted',
  'construction',
  'production',
  'expansion',
  'rehabilitation',
  'closed'
);

CREATE TYPE data_confidence_level AS ENUM (
  'high',
  'medium',
  'low',
  'unknown'
);

CREATE TYPE source_type AS ENUM (
  'jorc_resource',
  'ni_43_101',
  'sec_filing',
  'government_statistical',
  'government_geological',
  'academic_peer_reviewed',
  'corporate_disclosure',
  'industry_report',
  'news_verified',
  'estimated',
  'unknown'
);

CREATE TYPE mineral_category AS ENUM (
  'battery_metal',
  'rare_earth',
  'base_metal',
  'precious_metal',
  'energy_mineral',
  'industrial_mineral',
  'strategic_mineral'
);

CREATE TYPE paleo_environment AS ENUM (
  'craton',
  'pegmatite_belt',
  'brine_basin',
  'volcanic_arc',
  'rift_zone',
  'greenstone_belt',
  'fold_and_thrust_belt',
  'porphyry_belt',
  'sedimentary_basin',
  'ophiolite_belt',
  'metamorphic_terrane',
  'continental_margin'
);

-- =============================================================
-- TABLE: minerals
-- Master mineral reference table
-- =============================================================

CREATE TABLE minerals (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol                TEXT NOT NULL UNIQUE,          -- Li, Cu, Co, etc.
  name                  TEXT NOT NULL UNIQUE,          -- Lithium, Copper, etc.
  category              mineral_category NOT NULL,
  atomic_number         INTEGER,
  iea_critical          BOOLEAN DEFAULT false,          -- IEA Critical Minerals list
  eu_critical           BOOLEAN DEFAULT false,          -- EU CRM list
  us_critical           BOOLEAN DEFAULT false,          -- USGS Critical Minerals list
  strategic_importance  INTEGER CHECK (strategic_importance BETWEEN 1 AND 10),
  typical_grade_unit    TEXT,                           -- %, g/t, ppm, etc.
  primary_use           TEXT,
  ev_relevance          BOOLEAN DEFAULT false,
  energy_transition_use TEXT[],
  display_color         TEXT,                           -- hex color for map markers
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE minerals IS 'Master reference for all tracked minerals and their strategic properties';

-- =============================================================
-- TABLE: countries
-- Country reference with risk metrics
-- =============================================================

CREATE TABLE countries (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  iso_alpha2              CHAR(2) NOT NULL UNIQUE,
  iso_alpha3              CHAR(3) NOT NULL UNIQUE,
  name                    TEXT NOT NULL,
  region                  TEXT,                         -- Africa, Asia-Pacific, etc.
  sub_region              TEXT,
  political_stability_score INTEGER CHECK (political_stability_score BETWEEN 0 AND 100),
  rule_of_law_score       INTEGER CHECK (rule_of_law_score BETWEEN 0 AND 100),
  corruption_perception_index INTEGER CHECK (corruption_perception_index BETWEEN 0 AND 100),
  mining_jurisdiction_score INTEGER CHECK (mining_jurisdiction_score BETWEEN 0 AND 100),
  royalty_regime          TEXT,
  permitting_complexity   TEXT CHECK (permitting_complexity IN ('low', 'medium', 'high', 'very_high')),
  country_risk_composite  INTEGER CHECK (country_risk_composite BETWEEN 0 AND 100),
  currency_code           CHAR(3),
  primary_language        TEXT,
  gdp_usd_billions        DECIMAL,
  mining_gdp_percent      DECIMAL,
  -- PostGIS geometry: country centroid for map label placement
  centroid                GEOMETRY(POINT, 4326),
  boundary                GEOMETRY(MULTIPOLYGON, 4326),
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE countries IS 'Country reference table with geopolitical risk metrics for deposit scoring';

CREATE INDEX idx_countries_boundary ON countries USING GIST(boundary);
CREATE INDEX idx_countries_iso ON countries(iso_alpha2, iso_alpha3);

-- =============================================================
-- TABLE: companies
-- Operators, owners, joint venture partners
-- =============================================================

CREATE TABLE companies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  ticker              TEXT,                             -- stock ticker if public
  exchange            TEXT,                             -- NYSE, ASX, TSX, LSE, etc.
  country_id          UUID REFERENCES countries(id),
  company_type        TEXT CHECK (company_type IN ('major', 'mid_tier', 'junior', 'state_owned', 'private')),
  market_cap_usd      DECIMAL,
  annual_revenue_usd  DECIMAL,
  esg_score           INTEGER CHECK (esg_score BETWEEN 0 AND 100),
  website             TEXT,
  primary_minerals    TEXT[],
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE companies IS 'Mining companies, operators, and owners referenced across deposits';

-- =============================================================
-- TABLE: paleo_regions
-- Ancient geological provinces and mineral-forming environments
-- =============================================================

CREATE TABLE paleo_regions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  paleo_environment     paleo_environment NOT NULL,
  age_ma_min            DECIMAL,                        -- Age in millions of years (min)
  age_ma_max            DECIMAL,                        -- Age in millions of years (max)
  geological_era        TEXT,                           -- Archean, Proterozoic, etc.
  countries             TEXT[],
  known_mineral_systems TEXT[],                         -- which minerals form here
  analog_regions        TEXT[],                         -- similar terrain elsewhere
  description           TEXT,
  exploration_potential TEXT CHECK (exploration_potential IN ('very_high', 'high', 'moderate', 'low')),
  certainty_note        TEXT DEFAULT 'This is a geological environment assessment, not a resource estimate. Similarity to deposit-forming settings does not confirm mineralization.',
  -- PostGIS polygon for the province boundary
  geometry              GEOMETRY(MULTIPOLYGON, 4326),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE paleo_regions IS 'Ancient geological provinces used for paleo geology map and exploration targeting. All interpretations are probabilistic, not factual resource claims.';

CREATE INDEX idx_paleo_regions_geom ON paleo_regions USING GIST(geometry);

-- =============================================================
-- TABLE: deposits  (CORE TABLE)
-- All tracked mineral deposits globally
-- =============================================================

CREATE TABLE deposits (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  name                    TEXT NOT NULL,
  alternate_names         TEXT[],
  country_id              UUID NOT NULL REFERENCES countries(id),
  country                 TEXT NOT NULL,               -- denormalized for fast access
  region                  TEXT,                        -- sub-national region/state/province
  locality                TEXT,                        -- nearest town / landmark

  -- Geospatial (PostGIS)
  latitude                DECIMAL(10, 7) NOT NULL,
  longitude               DECIMAL(11, 7) NOT NULL,
  location                GEOMETRY(POINT, 4326),      -- PostGIS spatial index column
  elevation_m             INTEGER,
  area_km2                DECIMAL,

  -- Mineralogy
  primary_mineral         TEXT NOT NULL,
  primary_mineral_id      UUID REFERENCES minerals(id),
  secondary_minerals      TEXT[],
  secondary_mineral_ids   UUID[],
  deposit_type            TEXT NOT NULL,               -- pegmatite, porphyry, SEDEX, etc.
  deposit_subtype         TEXT,
  paleo_region_id         UUID REFERENCES paleo_regions(id),
  paleo_setting           TEXT,

  -- Status
  status                  deposit_status NOT NULL DEFAULT 'unknown',
  development_stage       development_stage_type,
  production_start_year   INTEGER,
  production_end_year     INTEGER,
  discovery_year          INTEGER,

  -- Resource / Reserve (JORC / NI 43-101 / SAMREC)
  resource_standard       TEXT,                        -- JORC, NI43-101, SAMREC, etc.
  resource_size_tonnes    DECIMAL,                     -- total resource in tonnes
  reserve_size_tonnes     DECIMAL,                     -- proved + probable reserves
  grade_percent           DECIMAL,                     -- primary mineral grade
  grade_unit              TEXT DEFAULT '%',            -- %, g/t, ppm
  contained_metal_tonnes  DECIMAL,                     -- grade × tonnage
  resource_category       TEXT,                        -- measured, indicated, inferred, mixed
  resource_year           INTEGER,                     -- year of last resource estimate

  -- Ownership
  owner_company_id        UUID REFERENCES companies(id),
  operator_company_id     UUID REFERENCES companies(id),
  owner                   TEXT,                        -- denormalized
  operator                TEXT,                        -- denormalized
  ownership_structure     JSONB,                       -- {company: %, ...}

  -- Scoring (all 0–100)
  opportunity_score       INTEGER CHECK (opportunity_score BETWEEN 0 AND 100),
  difficulty_score        INTEGER CHECK (difficulty_score BETWEEN 0 AND 100),
  underutilization_score  INTEGER CHECK (underutilization_score BETWEEN 0 AND 100),
  infrastructure_score    INTEGER CHECK (infrastructure_score BETWEEN 0 AND 100),
  country_risk_score      INTEGER CHECK (country_risk_score BETWEEN 0 AND 100),
  environmental_risk_score INTEGER CHECK (environmental_risk_score BETWEEN 0 AND 100),
  data_confidence         data_confidence_level DEFAULT 'unknown',
  data_confidence_notes   TEXT,

  -- Infrastructure
  road_access             BOOLEAN,
  rail_access             BOOLEAN,
  port_distance_km        DECIMAL,
  power_access            BOOLEAN,
  water_access            BOOLEAN,
  nearest_port            TEXT,
  nearest_city            TEXT,
  nearest_city_km         DECIMAL,
  infrastructure_notes    TEXT,

  -- Risk / Regulatory
  permitting_status       TEXT,
  environmental_sensitivity TEXT CHECK (environmental_sensitivity IN ('low', 'moderate', 'high', 'critical')),
  indigenous_land_overlap BOOLEAN,
  protected_area_overlap  BOOLEAN,
  political_risk_notes    TEXT,
  environmental_notes     TEXT,
  permitting_notes        TEXT,

  -- Intelligence
  ai_summary              TEXT,
  ai_summary_updated_at   TIMESTAMP,
  analyst_notes           TEXT,
  flags                   TEXT[],                      -- ['high_priority', 'data_gap', 'expansion_potential']

  -- Metadata
  last_updated            TIMESTAMP DEFAULT NOW(),
  created_at              TIMESTAMP DEFAULT NOW(),
  created_by              TEXT DEFAULT 'system',
  source_count            INTEGER DEFAULT 0,

  CONSTRAINT valid_latitude  CHECK (latitude  BETWEEN -90  AND 90),
  CONSTRAINT valid_longitude CHECK (longitude BETWEEN -180 AND 180)
);

COMMENT ON TABLE deposits IS 'Core table: all tracked mineral deposits globally with geospatial, geological, ownership, and intelligence data';

-- Spatial index (critical for map queries)
CREATE INDEX idx_deposits_location   ON deposits USING GIST(location);
CREATE INDEX idx_deposits_country    ON deposits(country_id);
CREATE INDEX idx_deposits_mineral    ON deposits(primary_mineral);
CREATE INDEX idx_deposits_status     ON deposits(status);
CREATE INDEX idx_deposits_opp_score  ON deposits(opportunity_score DESC);
CREATE INDEX idx_deposits_difficulty ON deposits(difficulty_score);
CREATE INDEX idx_deposits_name_trgm  ON deposits USING GIN(name gin_trgm_ops);

-- Trigger: auto-populate PostGIS point from lat/lon
CREATE OR REPLACE FUNCTION sync_deposit_geometry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deposit_geometry
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON deposits
  FOR EACH ROW EXECUTE FUNCTION sync_deposit_geometry();

-- =============================================================
-- TABLE: sources
-- All intelligence sources for deposits
-- =============================================================

CREATE TABLE sources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_id      UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
  source_type     source_type NOT NULL,
  title           TEXT NOT NULL,
  publisher       TEXT NOT NULL,
  authors         TEXT[],
  publication_year INTEGER,
  publication_date DATE,
  url             TEXT,
  doi             TEXT,
  document_ref    TEXT,                               -- e.g. 'GA Record 2021/04'
  fields_populated TEXT[],                            -- which deposit fields this source informs
  relevance_score INTEGER CHECK (relevance_score BETWEEN 0 AND 100),
  excerpt         TEXT,
  is_primary      BOOLEAN DEFAULT false,              -- primary/authoritative source
  is_public       BOOLEAN DEFAULT true,
  verified_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE sources IS 'All cited sources that underpin deposit intelligence data';

CREATE INDEX idx_sources_deposit ON sources(deposit_id);
CREATE INDEX idx_sources_type    ON sources(source_type);

-- =============================================================
-- TABLE: resource_estimates
-- Historical resource estimate series per deposit
-- =============================================================

CREATE TABLE resource_estimates (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_id            UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
  estimate_date         DATE NOT NULL,
  resource_standard     TEXT NOT NULL,               -- JORC, NI43-101, etc.
  resource_size_tonnes  DECIMAL,
  reserve_size_tonnes   DECIMAL,
  grade_percent         DECIMAL,
  grade_unit            TEXT,
  contained_metal       DECIMAL,
  category              TEXT,                        -- measured/indicated/inferred breakdown
  competent_person      TEXT,
  source_id             UUID REFERENCES sources(id),
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE resource_estimates IS 'Time-series of resource estimate statements for tracking resource growth or depletion';

CREATE INDEX idx_resource_estimates_deposit ON resource_estimates(deposit_id);

-- =============================================================
-- TABLE: production_history
-- Annual production records per deposit
-- =============================================================

CREATE TABLE production_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_id      UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
  year            INTEGER NOT NULL,
  mineral         TEXT NOT NULL,
  product         TEXT,                              -- e.g. 'spodumene concentrate', 'LCE'
  quantity_tonnes DECIMAL,
  unit            TEXT DEFAULT 'tonnes',
  grade_percent   DECIMAL,
  revenue_usd     DECIMAL,
  source_id       UUID REFERENCES sources(id),
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),

  UNIQUE (deposit_id, year, mineral)
);

COMMENT ON TABLE production_history IS 'Annual production time-series per deposit, suitable for trend analysis';

CREATE INDEX idx_production_deposit ON production_history(deposit_id);
CREATE INDEX idx_production_year    ON production_history(year);

-- =============================================================
-- TABLE: deposit_flags (AI / Analyst annotation)
-- =============================================================

CREATE TABLE deposit_annotations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_id  UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
  flag_type   TEXT NOT NULL,   -- 'data_gap', 'high_priority', 'expansion_potential', 'review_needed'
  title       TEXT NOT NULL,
  body        TEXT,
  severity    TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  source      TEXT DEFAULT 'system',
  created_at  TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_annotations_deposit ON deposit_annotations(deposit_id);

-- =============================================================
-- VIEWS
-- =============================================================

-- Deposit summary view for API responses
CREATE VIEW deposit_summary AS
SELECT
  d.id,
  d.name,
  d.country,
  d.region,
  d.latitude,
  d.longitude,
  d.primary_mineral,
  d.secondary_minerals,
  d.deposit_type,
  d.status,
  d.development_stage,
  d.resource_size_tonnes,
  d.grade_percent,
  d.grade_unit,
  d.contained_metal_tonnes,
  d.owner,
  d.operator,
  d.opportunity_score,
  d.difficulty_score,
  d.underutilization_score,
  d.infrastructure_score,
  d.country_risk_score,
  d.environmental_risk_score,
  d.data_confidence,
  d.ai_summary,
  d.last_updated,
  m.display_color   AS mineral_color,
  m.iea_critical,
  m.strategic_importance,
  c.political_stability_score,
  c.mining_jurisdiction_score,
  (SELECT COUNT(*) FROM sources s WHERE s.deposit_id = d.id) AS source_count,
  ST_AsGeoJSON(d.location)::jsonb AS geojson_point
FROM deposits d
LEFT JOIN minerals m ON d.primary_mineral_id = m.id
LEFT JOIN countries c ON d.country_id = c.id;

-- Top opportunities view
CREATE VIEW top_opportunities AS
SELECT *
FROM deposit_summary
WHERE opportunity_score >= 70
  AND data_confidence IN ('high', 'medium')
ORDER BY opportunity_score DESC, difficulty_score ASC;

-- =============================================================
-- INDEXES for common API query patterns
-- =============================================================

-- Bounding box map queries: WHERE location && ST_MakeEnvelope(minLon, minLat, maxLon, maxLat, 4326)
-- Already covered by GIST index on location

-- Mineral + status filter (common sidebar filter)
CREATE INDEX idx_deposits_mineral_status ON deposits(primary_mineral, status);

-- Scoring leaderboard
CREATE INDEX idx_deposits_scores ON deposits(opportunity_score DESC, difficulty_score ASC, data_confidence);
