// =============================================================
// STRATALAND — Shared TypeScript Types
// =============================================================

export type DepositStatus =
  | 'producing'
  | 'past_producing'
  | 'undeveloped'
  | 'exploration'
  | 'feasibility'
  | 'construction'
  | 'care_and_maintenance'
  | 'unknown';

export type DataConfidence = 'high' | 'medium' | 'low' | 'unknown';

export type DevelopmentStage =
  | 'grassroots'
  | 'early_exploration'
  | 'advanced_exploration'
  | 'pre_feasibility'
  | 'feasibility'
  | 'permitted'
  | 'construction'
  | 'production'
  | 'expansion'
  | 'rehabilitation'
  | 'closed';

// ── Core deposit shape returned by GET /deposits ──────────────
export interface DepositSummary {
  id: string;
  name: string;
  country: string;
  region: string | null;
  latitude: number;
  longitude: number;
  primary_mineral: string;
  secondary_minerals: string[];
  deposit_type: string;
  status: DepositStatus;
  development_stage: DevelopmentStage | null;
  resource_size_tonnes: number | null;
  grade_percent: number | null;
  grade_unit: string;
  owner: string | null;
  operator: string | null;
  opportunity_score: number;
  difficulty_score: number;
  underutilization_score: number;
  infrastructure_score: number;
  country_risk_score: number;
  environmental_risk_score: number;
  data_confidence: DataConfidence;
  ai_summary: string | null;
  flags: string[];
  mineral_color: string;
  source_count: number;
  last_updated: string;
}

// ── Full deposit detail returned by GET /deposits/:id ─────────
export interface DepositDetail extends DepositSummary {
  alternate_names: string[];
  locality: string | null;
  elevation_m: number | null;
  area_km2: number | null;
  secondary_mineral_ids: string[];
  paleo_setting: string | null;
  production_start_year: number | null;
  production_end_year: number | null;
  discovery_year: number | null;
  resource_standard: string | null;
  reserve_size_tonnes: number | null;
  contained_metal_tonnes: number | null;
  resource_category: string | null;
  resource_year: number | null;
  ownership_structure: Record<string, number> | null;
  road_access: boolean | null;
  rail_access: boolean | null;
  port_distance_km: number | null;
  power_access: boolean | null;
  water_access: boolean | null;
  nearest_port: string | null;
  nearest_city: string | null;
  nearest_city_km: number | null;
  infrastructure_notes: string | null;
  permitting_status: string | null;
  environmental_sensitivity: 'low' | 'moderate' | 'high' | 'critical' | null;
  indigenous_land_overlap: boolean | null;
  protected_area_overlap: boolean | null;
  political_risk_notes: string | null;
  environmental_notes: string | null;
  permitting_notes: string | null;
  data_confidence_notes: string | null;
  analyst_notes: string | null;
}

// ── GeoJSON FeatureCollection for map layer ──────────────────
export interface DepositFeatureProperties
  extends Pick<
    DepositSummary,
    | 'id' | 'name' | 'country' | 'region' | 'primary_mineral'
    | 'secondary_minerals' | 'deposit_type' | 'status'
    | 'opportunity_score' | 'difficulty_score' | 'underutilization_score'
    | 'data_confidence' | 'mineral_color' | 'source_count' | 'flags'
  > {
  resource_size_label: string;
  grade_label: string;
  marker_size: 'sm' | 'md' | 'lg' | 'xl';
}

export interface DepositGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: DepositFeatureProperties;
  }>;
}

// ── API response wrappers ─────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  meta: {
    total: number;
    page: number;
    per_page: number;
    generated_at: string;
  };
}

export interface ApiError {
  error: string;
  code: string;
  details?: string;
}

// ── Map filter state ──────────────────────────────────────────
export interface MapFilters {
  minerals: string[];
  statuses: DepositStatus[];
  min_opportunity: number;
  max_difficulty: number;
  data_confidence: DataConfidence[];
  countries: string[];
  bbox: [number, number, number, number] | null; // [minLon, minLat, maxLon, maxLat]
}

// ── Mineral reference ─────────────────────────────────────────
export interface Mineral {
  id: string;
  symbol: string;
  name: string;
  category: string;
  iea_critical: boolean;
  eu_critical: boolean;
  us_critical: boolean;
  strategic_importance: number;
  display_color: string;
  primary_use: string;
  ev_relevance: boolean;
}

// ── Paleo region ──────────────────────────────────────────────
export interface PaleoRegion {
  id: string;
  name: string;
  paleo_environment: string;
  age_ma_min: number | null;
  age_ma_max: number | null;
  geological_era: string | null;
  countries: string[];
  known_mineral_systems: string[];
  exploration_potential: 'very_high' | 'high' | 'moderate' | 'low';
  description: string | null;
  certainty_note: string;
  geojson: GeoJSON.MultiPolygon | null;
}
