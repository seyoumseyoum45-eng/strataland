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
}

export interface Mineral {
  symbol: string;
  name: string;
  display_color: string;
  iea_critical: boolean;
}
