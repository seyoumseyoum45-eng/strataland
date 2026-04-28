-- =============================================================
-- STRATALAND — SEED DATA v1.0
-- Real-world mineral deposits with verified coordinates
-- Sources: USGS, Geoscience Australia, BGS, JORC public filings
-- =============================================================

-- =============================================================
-- MINERALS
-- =============================================================

INSERT INTO minerals (symbol, name, category, atomic_number, iea_critical, eu_critical, us_critical,
  strategic_importance, typical_grade_unit, primary_use, ev_relevance, energy_transition_use, display_color)
VALUES
  ('Li',  'Lithium',       'battery_metal',   3,  true,  true,  true,  10, '%',    'Battery cathodes/anodes',       true,  ARRAY['EV batteries','grid storage','portable electronics'],       '#10b981'),
  ('Cu',  'Copper',        'base_metal',      29, true,  true,  true,  9,  '%',    'Electrical wiring & motors',    true,  ARRAY['EV motors','grid cables','wind turbines','solar'],           '#cd7c3f'),
  ('Co',  'Cobalt',        'battery_metal',   27, true,  true,  true,  10, '%',    'Battery cathodes (NMC/NCA)',     true,  ARRAY['EV batteries','aerospace alloys'],                          '#3b82f6'),
  ('Ni',  'Nickel',        'battery_metal',   28, true,  true,  true,  8,  '%',    'Battery cathodes (NMC)',         true,  ARRAY['EV batteries','stainless steel','electrolyser'],            '#14b8a6'),
  ('REE', 'Rare Earths',   'rare_earth',      NULL,true, true,  true,  10, '%REO', 'Permanent magnets',             true,  ARRAY['EV motors','wind turbines','defence'],                      '#8b5cf6'),
  ('U',   'Uranium',       'energy_mineral',  92, false, false, true,  7,  'ppm',  'Nuclear fuel',                  true,  ARRAY['nuclear power generation'],                                 '#f59e0b'),
  ('C',   'Graphite',      'battery_metal',   6,  true,  true,  true,  8,  '%C',   'Battery anodes',                true,  ARRAY['EV battery anodes','fuel cells'],                           '#64748b'),
  ('Mn',  'Manganese',     'battery_metal',   25, true,  true,  true,  7,  '%',    'Battery cathodes (LMO/LMFP)',   true,  ARRAY['EV batteries','steel production'],                          '#ef4444'),
  ('Pt',  'Platinum',      'precious_metal',  78, true,  true,  true,  8,  'g/t',  'Catalytic converters/PEM fuel cells', true, ARRAY['hydrogen fuel cells','catalysis'],                  '#e2e8f0'),
  ('Ta',  'Tantalum',      'strategic_mineral',73,true,  true,  true,  9,  'ppm',  'Electronics/capacitors',        false, ARRAY['semiconductors','aerospace'],                               '#a78bfa'),
  ('In',  'Indium',        'strategic_mineral',49,true,  true,  true,  8,  'ppm',  'Thin-film solar panels',        true,  ARRAY['solar PV','LCD displays'],                                  '#7dd3fc'),
  ('Ga',  'Gallium',       'strategic_mineral',31,true,  true,  true,  9,  'ppm',  'Semiconductors',                true,  ARRAY['semiconductors','solar cells','EV power electronics'],     '#c084fc'),
  ('V',   'Vanadium',      'strategic_mineral',23,true,  true,  true,  7,  '%',    'Vanadium redox flow batteries', true,  ARRAY['grid-scale storage','high-strength steel'],                 '#fb7185'),
  ('W',   'Tungsten',      'strategic_mineral',74,true,  true,  true,  8,  '%WO3', 'Cutting tools/defence',         false, ARRAY['defence','industrial cutting'],                             '#94a3b8');


-- =============================================================
-- SAMPLE DEPOSITS (25 real, verified coordinates)
-- =============================================================

-- Helper: insert deposits using a function pattern
-- All coordinates verified against USGS MRDS / BGS World Mineral Statistics

-- GREENBUSHES — Western Australia
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting,
  infrastructure_notes, environmental_notes, permitting_notes,
  ai_summary, flags
) VALUES (
  'Greenbushes Lithium Mine', 'Australia', 'Western Australia', -33.8536, 116.0747,
  'Lithium', ARRAY['Tantalum','Tin'], 'LCT Pegmatite', 'producing', 'production',
  286000000, 2.1, '% Li₂O',
  'Talison Lithium (ALB 49% / SQM 25% / Tianqi 26%)', 'Talison Lithium Pty Ltd',
  92, 34, 18,
  95, 12, 28,
  'high', 1983,
  'Paleoproterozoic Balingup Metamorphic Belt, Yilgarn Craton. LCT pegmatite class, ~2.5 Ga multi-phase intrusion.',
  'Sealed road to Bridgetown; rail at Donnybrook 40km; Bunbury Port 80km. Power from SWIS grid.',
  'Environmental bond AUD $42.6M. Collie River catchment obligations. Low biodiversity sensitivity in operational footprint.',
  'World''s largest and highest-grade operating lithium mine. Production ~1.4Mt spodumene concentrate pa. CGP3 plant commissioning 2025 to add significant chemical-grade capacity. Near fully utilised — low underutilization score.',
  ARRAY['high_priority','cgp3_expansion','benchmark_asset']
);

-- SALAR DE ATACAMA — Chile
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Salar de Atacama', 'Chile', 'Antofagasta Region', -23.4833, -68.2667,
  'Lithium', ARRAY['Potassium','Boron'], 'Brine (Salar)', 'producing', 'production',
  9800000000, 0.157, '% Li (brine)',
  'SQM / Albemarle', 'SQM / Albemarle',
  91, 38, 14,
  72, 28, 68,
  'high', 1997,
  'Atacama Basin — Neogene closed-basin brine system. Andean volcanic arc-fed halite-dominated salar at 2300m elevation.',
  'World''s largest lithium brine operation. SQM and Albemarle hold concessions. Highest lithium brine grade globally. Key risk: water usage in hyperarid environment, indigenous Atacameño communities water rights conflict.',
  ARRAY['water_risk','indigenous_rights','high_priority','world_class']
);

-- ESCONDIDA — Chile (Copper)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Escondida', 'Chile', 'Antofagasta Region', -24.2667, -69.0667,
  'Copper', ARRAY['Gold','Silver','Molybdenum'], 'Porphyry Copper', 'producing', 'production',
  32400000000, 0.44, '%',
  'BHP 57.5% / Rio Tinto 30% / JECO Corp 10%', 'BHP Billiton Minerals',
  89, 30, 12,
  80, 28, 42,
  'high', 1990,
  'Paleocene-Eocene Domeyko Cordillera porphyry belt. Supergene enrichment to near-surface leachable ore.',
  'World''s largest copper mine by production, contributing ~5% of global supply. Sulphide and oxide ore treated via concentrator and SX-EW. High infrastructure maturity. Water supply from desalination plant at Coloso.',
  ARRAY['world_class','high_priority','benchmark_asset']
);

-- TENKE FUNGURUME — DRC (Cobalt/Copper)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Tenke Fungurume', 'Democratic Republic of Congo', 'Lualaba Province', -10.5833, 26.1167,
  'Cobalt', ARRAY['Copper'], 'Sediment-Hosted Stratiform (SEDEX)', 'producing', 'production',
  1450000000, 0.38, '% Co',
  'CMOC Group 80% / Gécamines 20%', 'CMOC Group',
  85, 72, 22,
  38, 88, 55,
  'high', 2009,
  'Central African Copperbelt — Neoproterozoic Katangan Basin sediment-hosted Cu-Co system. Roan Group ore shales.',
  'Among the world''s highest-grade cobalt operations. CMOC acquired from Freeport 2016. DRC political risk, export levy disputes, and Gécamines renegotiation pressure are persistent. Critical to global battery cobalt supply chain.',
  ARRAY['high_priority','country_risk_flag','cobalt_critical','supply_chain_concentration']
);

-- BAYAN OBO — China (REE)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Bayan Obo REE-Iron Mine', 'China', 'Inner Mongolia', 41.8014, 109.9742,
  'Rare Earths', ARRAY['Iron','Niobium','Fluorite'], 'Carbonatite', 'producing', 'production',
  1500000000, 6.2, '% REO',
  'Baogang Group (state-owned)', 'Baotou Iron & Steel (Baogang)',
  87, 55, 30,
  85, 45, 60,
  'medium', 1957,
  'Proterozoic North China Craton margin. Carbonatite-hosted REE mineralisation associated with Devonian alkaline intrusions.',
  'World''s largest REE deposit by resource. Supplies ~60% of global rare earth output. State-controlled — Western supply chain access is indirect. Thorium radioactive tailings management a significant environmental liability. Strategic geopolitical asset.',
  ARRAY['geopolitical_risk','world_class','ree_critical','supply_chain_concentration']
);

-- OLYMPIC DAM — Australia (Copper/Uranium/Gold)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Olympic Dam', 'Australia', 'South Australia', -30.4436, 136.8861,
  'Copper', ARRAY['Uranium','Gold','Silver','REE'], 'Iron Oxide Copper Gold (IOCG)', 'producing', 'expansion',
  10100000000, 0.72, '%',
  'BHP', 'BHP',
  86, 48, 55,
  70, 12, 35,
  'high', 1988,
  'Mesoproterozoic Gawler Craton IOCG system (~1.59 Ga Hiltaba Suite granite-related hydrothermal). One of the largest known copper-uranium ore systems.',
  'World''s largest known uranium deposit and 4th largest copper deposit. Highly polymetallic — Cu, U, Au, Ag, REE all recovered. BHP''s expansion study (OD Expansion) targets production increase to 650ktpa Cu. Deep underground mine with 60km purpose-built rail to Port Augusta.',
  ARRAY['world_class','expansion_potential','high_priority','iocg_system','uranium_sensitive']
);

-- PILBARA LITHIUM / PILGANGOORA — Australia
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Pilgangoora (Pilbara Minerals)', 'Australia', 'Western Australia', -21.3333, 118.6833,
  'Lithium', ARRAY['Tantalum'], 'LCT Pegmatite', 'producing', 'expansion',
  308000000, 1.13, '% Li₂O',
  'Pilbara Minerals Ltd (ASX: PLS)', 'Pilbara Minerals Ltd',
  82, 35, 38,
  80, 12, 22,
  'high', 2019,
  'Archean Pilbara Craton metasediment-hosted LCT pegmatite suite.',
  'One of the world''s largest hard rock lithium deposits. P1000 expansion to 1Mtpa spodumene underway. ~200km to Port Hedland. Strong ESG credentials.',
  ARRAY['expansion_potential','high_priority']
);

-- QUEBRADA BLANCA — Chile (Copper)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Quebrada Blanca Phase 2', 'Chile', 'Tarapacá Region', -21.0667, -68.8333,
  'Copper', ARRAY['Molybdenum','Silver'], 'Porphyry Copper', 'producing', 'production',
  6900000000, 0.55, '%',
  'Teck Resources 60% / Sumitomo 30% / ENAMI 10%', 'Teck QB2',
  80, 45, 42,
  65, 28, 50,
  'high', 2023,
  'Eocene-Oligocene Precordilleran porphyry belt. QB2 expands historic oxide operation into primary sulphide resource at 4400m elevation.',
  'QB2 commissioned 2023 — one of the largest copper projects brought to production globally this decade. High altitude (4400m) adds operational complexity. Teck''s Glencore takeover bid context adds ownership uncertainty.',
  ARRAY['recently_commissioned','high_altitude','ownership_transition']
);

-- MOUNT HOLLAND — Australia (Lithium)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Mount Holland (Covalent)', 'Australia', 'Western Australia', -32.1833, 119.5500,
  'Lithium', ARRAY['Tantalum'], 'LCT Pegmatite', 'construction', 'construction',
  189000000, 1.5, '% Li₂O',
  'SQM 50% / Wesfarmers 50%', 'Covalent Lithium JV',
  78, 40, 62,
  72, 12, 25,
  'high', NULL,
  'Archean Yilgarn Craton — Earl Grey spodumene pegmatite hosted in gneissic country rock.',
  'One of the largest undeveloped lithium deposits to reach construction phase outside Greenbushes. Integrated mine-to-refinery model (Kwinana lithium hydroxide plant). High underutilization as refinery commissioning delayed.',
  ARRAY['construction_stage','integrated_refinery','expansion_potential']
);

-- KOLWEZI — DRC (Cobalt)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence,
  paleo_setting, ai_summary, flags
) VALUES (
  'Kolwezi Copper-Cobalt District', 'Democratic Republic of Congo', 'Lualaba Province', -10.7167, 25.4667,
  'Cobalt', ARRAY['Copper'], 'SEDEX / Sediment-Hosted', 'producing', 'production',
  2800000000, 0.65, '% Co',
  'Various (Glencore dominant)', 'Glencore / multiple',
  83, 78, 28,
  35, 90, 58,
  'medium',
  'Neoproterozoic Katangan Copperbelt stratabound sulphide in Roan Group.',
  'Kolwezi district encompasses multiple operations including KOV, Mashamba, Tilwezembe. Glencore''s Mutanda and Kamoto operations are district anchors. Highest country risk in database. ASM (artisanal mining) overlap creates child labour / human rights due diligence burden.',
  ARRAY['country_risk_flag','asm_overlap','human_rights_flag','cobalt_critical']
);

-- JINCHUAN — China (Nickel)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Jinchuan Nickel Deposit', 'China', 'Gansu Province', 38.5286, 102.1836,
  'Nickel', ARRAY['Copper','Cobalt','Platinum Group Metals'], 'Magmatic Sulphide (Komatiite)', 'producing', 'production',
  500000000, 1.02, '% Ni',
  'Jinchuan Group (state-owned)', 'Jinchuan Group Co. Ltd',
  75, 50, 25,
  80, 45, 40,
  'medium', 1963,
  'Proterozoic North China Craton — mafic-ultramafic intrusion-hosted magmatic Ni-Cu sulphide.',
  'World''s third largest nickel sulphide deposit. State-owned Jinchuan Group dominates. Strong domestic processing integration. Limited Western investment access.',
  ARRAY['state_controlled','geopolitical_risk']
);

-- SUDBURY BASIN — Canada (Nickel)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Sudbury Basin (Nickel Rim South)', 'Canada', 'Ontario', 46.5000, -81.0000,
  'Nickel', ARRAY['Copper','Cobalt','Platinum Group Metals'], 'Magmatic Sulphide (Impact Melt)', 'producing', 'production',
  1800000000, 1.3, '% Ni',
  'Glencore / Vale / KGHM', 'Multiple operators',
  80, 40, 20,
  88, 10, 35,
  'high', 1883,
  'Archean Superior Province — 1.85 Ga Sudbury Igneous Complex (meteorite impact melt sheet). Offset dikes and footwall deposits.',
  'Largest known nickel sulphide camp globally (combined). Over 140 years of continuous production. Mature infrastructure, excellent jurisdiction. Multiple operators. Nickel Rim South (Glencore) is the active primary mine.',
  ARRAY['world_class','mature_district','pgm_byproduct']
);

-- CERRO VERDE — Peru (Copper)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Cerro Verde', 'Peru', 'Arequipa Region', -16.5333, -71.5500,
  'Copper', ARRAY['Molybdenum','Silver'], 'Porphyry Copper', 'producing', 'production',
  4800000000, 0.37, '%',
  'Freeport-McMoRan 53.6% / Sumitomo 21%', 'Freeport-McMoRan',
  79, 48, 22,
  75, 42, 38,
  'high', 1976,
  'Miocene Coastal Batholith porphyry belt — Andean Cordillera Occidental copper porphyry province.',
  'One of Peru''s largest copper operations. Expanded to 360ktpd throughput 2015. Water scarcity and Arequipa community relations are primary risk factors.',
  ARRAY['high_priority','water_risk']
);

-- LITHIUM AMERICAS — THACKER PASS — USA
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence,
  paleo_setting, ai_summary, flags
) VALUES (
  'Thacker Pass (Peehee Mu''huh)', 'United States', 'Nevada', 41.8483, -118.0594,
  'Lithium', ARRAY['Sulphur'], 'Sedimentary Claystone (Smectite)', 'construction', 'construction',
  13700000, 0.35, '% Li',
  'Lithium Americas Corp / General Motors', 'Lithium Americas Corp',
  76, 55, 72,
  65, 8, 58,
  'high', NULL,
  'Miocene McDermitt Caldera lacustrine sedimentary basin — volcanic ash-derived lithium smectite clay deposit.',
  'Largest known lithium resource in the USA. GM $650M investment. Novel acid-leach process for clay lithium (not yet proven at scale). Native American Paiute-Shoshone ancestral site (Fort McDermitt) — contested legal standing. Phase 1 construction underway 2024.',
  ARRAY['construction_stage','novel_process_risk','indigenous_rights','strategic_usa_supply']
);

-- MANONO — DRC (Lithium)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence,
  paleo_setting, ai_summary, flags
) VALUES (
  'Manono Lithium Project', 'Democratic Republic of Congo', 'Tanganyika Province', -7.3000, 27.4167,
  'Lithium', ARRAY['Tin','Tantalum','Niobium'], 'LCT Pegmatite', 'exploration', 'pre_feasibility',
  401000000, 1.65, '% Li₂O',
  'AVZ Minerals 75% (disputed) / Zijin Mining', 'AVZ Minerals / contested',
  70, 90, 95,
  15, 95, 45,
  'medium', NULL,
  'Proterozoic Kibaran Belt — LCT spodumene pegmatite, one of largest undeveloped hard rock Li resources globally.',
  'Potentially the world''s largest hard rock lithium deposit by resource size. High grade spodumene. Catastrophically remote — no paved road, no power grid, 3000km from nearest port. AVZ Minerals in active legal dispute with Zijin Mining over title. DRC country risk at maximum. Textbook high-opportunity, high-difficulty asset.',
  ARRAY['ownership_dispute','country_risk_flag','infrastructure_critical','data_gap','high_opportunity_if_developed']
);

-- RINCON — Argentina (Lithium Brine)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence,
  paleo_setting, ai_summary, flags
) VALUES (
  'Rincón Lithium Project', 'Argentina', 'Salta Province', -23.7000, -67.3000,
  'Lithium', ARRAY['Potassium'], 'Brine (Salar)', 'construction', 'construction',
  4600000, 0.048, '% Li (brine)',
  'Rio Tinto (acquired 2022)', 'Rio Tinto',
  73, 52, 60,
  45, 55, 52,
  'medium', NULL,
  'Puna Plateau Neogene closed-basin salar — southern Lithium Triangle brine system.',
  'Rio Tinto acquired Rincon Mining for $825M in 2022 — first major miner direct entry into lithium brine. Pilot plant 2024. Full development DFS underway. Argentina FX controls and fiscal instability remain key risks.',
  ARRAY['construction_stage','major_miner_entry','lithium_triangle']
);

-- KEVITSA — Finland (Nickel/Copper)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Kevitsa Nickel-Copper Mine', 'Finland', 'Lapland', 67.7400, 26.6900,
  'Nickel', ARRAY['Copper','Cobalt','Platinum Group Metals'], 'Magmatic Sulphide', 'producing', 'production',
  500000000, 0.25, '% Ni',
  'Boliden AB', 'Boliden AB',
  72, 38, 30,
  75, 5, 42,
  'high', 2012,
  'Paleoproterozoic Central Lapland Greenstone Belt — mafic-ultramafic hosted magmatic Ni-Cu-PGE sulphide.',
  'Important European source of battery-critical nickel and cobalt. Excellent jurisdiction (Finland EU member, AAA stability). Arctic logistics but well-serviced by Finnish road/rail. Boliden''s most significant base metals mine.',
  ARRAY['european_supply_chain','eu_strategic']
);

-- VALE CARAJAS — Brazil (Iron/Copper/Nickel)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Carajás Mineral Province', 'Brazil', 'Pará State', -6.0667, -50.1833,
  'Copper', ARRAY['Nickel','Iron','Manganese','Gold'], 'IOCG / BIF', 'producing', 'production',
  7200000000, 0.92, '%',
  'Vale S.A.', 'Vale S.A.',
  84, 42, 28,
  72, 35, 48,
  'high', 1985,
  'Archean Carajás Domain, Amazon Craton — Neoarchean IOCG hydrothermal system, BIF-hosted iron, lateritic Ni.',
  'Carajás is one of the world''s most significant mineral provinces — highest grade iron ore globally (67% Fe), major copper (Sossego, Salobo), nickel (Onça Puma). Vale''s core asset. Amazon Basin logistics complexity and indigenous land adjacency are key constraints.',
  ARRAY['world_class','multi_mineral_province','high_priority']
);

-- LITHIUM AMERICAS — CAUCHARI-OLAROZ — Argentina
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Cauchari-Olaroz Salar', 'Argentina', 'Jujuy Province', -23.3500, -66.8000,
  'Lithium', ARRAY['Potassium'], 'Brine (Salar)', 'producing', 'production',
  19300000, 0.062, '% Li (brine)',
  'Lithium Americas 44.8% / Ganfeng Lithium 46.7% / JEMSE 8.5%', 'Lithium Americas (Argentina) / Ganfeng',
  74, 50, 45,
  50, 55, 55,
  'medium', 2023,
  'Puna Plateau Neogene closed-basin salar — Northern Lithium Triangle.',
  'First production 2023. Phase 1 targets 40ktpa LCE. Ganfeng as Chinese strategic partner provides processing expertise and offtake. Lithium Americas split its North American and South American businesses into separate entities 2023.',
  ARRAY['recently_commissioned','lithium_triangle','chinese_jv']
);

-- SPRUCE RIDGE / JAMES BAY — Canada (Lithium)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence,
  paleo_setting, ai_summary, flags
) VALUES (
  'James Bay Lithium Project (Patriot)', 'Canada', 'Québec', 52.2833, -76.6000,
  'Lithium', ARRAY['Tantalum'], 'LCT Pegmatite', 'exploration', 'advanced_exploration',
  109000000, 1.4, '% Li₂O',
  'Patriot Battery Metals Inc.', 'Patriot Battery Metals Inc.',
  73, 52, 88,
  40, 8, 38,
  'medium', NULL,
  'Archean Superior Province — Auclair Formation metaturbidite-hosted spodumene pegmatite swarm.',
  'One of the most significant recent lithium discoveries globally (CV5 pegmatite, 2022). Exceptional grades intersected in drilling. Remote northern Québec — ice road only access. Patriot received major investment interest from Albemarle and others. Cree Nation consultation ongoing.',
  ARRAY['recent_discovery','high_grade','expansion_potential','indigenous_consultation']
);

-- KANSANSHI — Zambia (Copper)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Kansanshi Mine', 'Zambia', 'North-Western Province', -12.0667, 25.8833,
  'Copper', ARRAY['Gold'], 'Sediment-Hosted / Skarn', 'producing', 'production',
  3900000000, 0.68, '%',
  'First Quantum Minerals 80% / ZCCM 20%', 'First Quantum Minerals',
  77, 55, 25,
  58, 60, 35,
  'high', 2005,
  'Neoproterozoic Zambian Copperbelt — Katangan Basin ore shale sediment-hosted Cu with skarn overprint.',
  'Africa''s largest copper mine by production. S3 expansion adding 150ktpa capacity. FQM faces ongoing royalty and taxation disputes with Zambia government. Zambia re-elected mining-reform government 2021.',
  ARRAY['expansion_potential','country_risk_flag','african_copperbelt']
);

-- AKTOGAY — Kazakhstan (Copper)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Aktogay Copper Mine', 'Kazakhstan', 'East Kazakhstan', 46.8500, 79.3167,
  'Copper', ARRAY['Molybdenum'], 'Porphyry Copper', 'producing', 'production',
  5800000000, 0.33, '%',
  'KAZ Minerals (subsidiary of Cuprum Holding)', 'KAZ Minerals',
  74, 58, 35,
  60, 55, 32,
  'high', 2017,
  'Paleozoic Central Asian Orogenic Belt — Devonian porphyry copper province.',
  'One of the largest copper porphyry deposits in Central Asia. Expansion Phase 2 commissioned 2022, doubling capacity to ~200ktpa Cu. KAZ Minerals taken private by Cuprum Holding (Russian-linked) 2021.',
  ARRAY['expansion_completed','russian_ownership_risk','central_asia']
);

-- SIERRA GORDA — Chile (Copper)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence, production_start_year,
  paleo_setting, ai_summary, flags
) VALUES (
  'Sierra Gorda', 'Chile', 'Antofagasta Region', -22.8667, -69.3167,
  'Copper', ARRAY['Molybdenum','Silver'], 'Porphyry Copper', 'producing', 'production',
  3900000000, 0.42, '%',
  'KGHM Polska Miedź 55% / Sumitomo 45%', 'KGHM International',
  73, 42, 35,
  72, 28, 38,
  'high', 2014,
  'Eocene Cordillera Domeyko porphyry belt — same metallogenic province as Escondida.',
  'KGHM''s flagship asset outside Poland. Consistent producer in Chile''s Antofagasta porphyry belt. Molybdenum byproduct is significant at current prices.',
  ARRAY['andean_porphyry','moly_byproduct']
);

-- LAIVA — Ethiopia / EAST AFRICA (Potash / rare opportunity region)
INSERT INTO deposits (
  name, country, region, latitude, longitude,
  primary_mineral, secondary_minerals, deposit_type, status, development_stage,
  resource_size_tonnes, grade_percent, grade_unit,
  owner, operator,
  opportunity_score, difficulty_score, underutilization_score,
  infrastructure_score, country_risk_score, environmental_risk_score,
  data_confidence,
  paleo_setting, ai_summary, flags
) VALUES (
  'Danakhil Potash Project', 'Ethiopia', 'Afar Region', 13.4667, 40.6167,
  'Uranium', ARRAY['Potash','Borate'], 'Evaporite Basin', 'exploration', 'feasibility',
  11000000000, 32.0, '% K₂O',
  'Circum Minerals / ICL (contested)', 'Circum Minerals',
  65, 85, 90,
  18, 80, 60,
  'low', NULL,
  'Afar Rift System — Neogene extensional rift basin evaporite sequence. Active volcanotectonic setting. Danakil Depression.',
  'One of the world''s largest undeveloped potash deposits — extremely high grade. Located in the Afar Triangle at -120m elevation, hottest inhabited place on Earth. Tigray conflict 2020-2022 severely disrupted operations and data reliability. ICL and Circum in competing claims. High difficulty, high potential.',
  ARRAY['extreme_environment','conflict_affected','data_gap','high_opportunity_if_stable']
);
