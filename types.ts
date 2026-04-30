export type DepositStatus = 'producing'|'past_producing'|'undeveloped'|'exploration'|'feasibility'|'construction'|'care_and_maintenance'|'unknown';
export type DataConfidence = 'high'|'medium'|'low'|'unknown';

export interface Deposit {
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
  development_stage: string | null;
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
  paleo_setting: string | null;
}

export interface KPIs {
  total_deposits: number;
  producing: number;
  undeveloped: number;
  countries_covered: number;
  minerals_covered: number;
  high_opportunity: number;
  high_confidence: number;
  avg_opportunity: number;
  african_deposits: number;
}

export interface Mineral {
  symbol: string;
  name: string;
  display_color: string;
  iea_critical: boolean;
}

export type DepositSummary = Deposit & {
  last_updated?: string;
};

export type DepositDetail = DepositSummary & {
  alternate_names?: string[];
  locality?: string | null;
  elevation_m?: number | null;
  area_km2?: number | null;
  secondary_mineral_ids?: string[];
  production_start_year?: number | null;
  production_end_year?: number | null;
  discovery_year?: number | null;
  resource_standard?: string | null;
  reserve_size_tonnes?: number | null;
  contained_metal_tonnes?: number | null;
  resource_category?: string | null;
  resource_year?: number | null;
  ownership_structure?: Record<string, number> | null;
  infrastructure_notes?: string | null;
  permitting_status?: string | null;
  political_risk_notes?: string | null;
  environmental_notes?: string | null;
  permitting_notes?: string | null;
  data_confidence_notes?: string | null;
  analyst_notes?: string | null;
};

export interface DepositFeatureProperties
  extends Pick<
    DepositSummary,
    | 'id' | 'name' | 'country' | 'region' | 'primary_mineral'
    | 'secondary_minerals' | 'deposit_type' | 'status'
    | 'opportunity_score' | 'difficulty_score' | 'underutilization_score'
    | 'data_confidence' | 'mineral_color' | 'source_count' | 'flags'
  > {
  resource_size_label?: string;
  grade_label?: string;
  marker_size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface DepositGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: DepositFeatureProperties;
  }>;
}

export interface MapFilters {
  minerals: string[];
  statuses: DepositStatus[];
  min_opportunity: number;
  max_difficulty: number;
  data_confidence?: DataConfidence[];
  countries?: string[];
  bbox?: [number, number, number, number] | null;
}
