import type { Deposit, KPIs, Mineral } from '../types';

// ── Mineral registry ───────────────────────────────────────────
export const MINERALS: Mineral[] = [
  { symbol:'Li',  name:'Lithium',      display_color:'#25f5a6', iea_critical:true  },
  { symbol:'Cu',  name:'Copper',       display_color:'#ff7a22', iea_critical:true  },
  { symbol:'Co',  name:'Cobalt',       display_color:'#3f8cff', iea_critical:true  },
  { symbol:'Ni',  name:'Nickel',       display_color:'#27d8b2', iea_critical:true  },
  { symbol:'REE', name:'Rare Earths',  display_color:'#a855f7', iea_critical:true  },
  { symbol:'U',   name:'Uranium',      display_color:'#f6b93b', iea_critical:false },
  { symbol:'C',   name:'Graphite',     display_color:'#94a3b8', iea_critical:true  },
  { symbol:'Mn',  name:'Manganese',    display_color:'#22d3ee', iea_critical:true  },
  { symbol:'Ta',  name:'Tantalum',     display_color:'#ffffff', iea_critical:true  },
];

export const MINERAL_COLOR: Record<string,string> = {
  Lithium:'#25f5a6', Copper:'#ff7a22', Cobalt:'#3f8cff',
  Nickel:'#27d8b2', 'Rare Earths':'#a855f7', Uranium:'#f6b93b',
  Graphite:'#94a3b8', Manganese:'#22d3ee', Tantalum:'#ffffff',
};

// ── Paleo/geologic context logic ───────────────────────────────
// Call getPaleoContext(deposit) to get a human-readable geologic label.
// All output explicitly flags uncertainty — no claimed predictions.
export function getPaleoContext(dep: Deposit): { label: string; note: string } {
  const dt  = dep.deposit_type.toLowerCase();
  const min = dep.primary_mineral.toLowerCase();

  if (dt.includes('pegmatite') && (min === 'lithium' || min === 'tantalum')) {
    return {
      label: 'Pegmatite belt / ancient crystalline basement',
      note:  'Possible related geologic environment: rare-metal LCT pegmatite province hosted in Proterozoic or Archean basement. Source-backed confidence required. Requires verification.',
    };
  }
  if (dt.includes('brine') || dt.includes('salar')) {
    return {
      label: 'Closed-basin evaporite / arid highland basin',
      note:  'Possible related geologic environment: Neogene closed-basin brine system in elevated plateau setting. Lithium sourced from volcanic arc or hydrothermal input. Requires verification.',
    };
  }
  if (dt.includes('porphyry') && min === 'copper') {
    return {
      label: 'Magmatic arc / subduction-related porphyry system',
      note:  'Possible related geologic environment: calc-alkaline porphyry copper system associated with active or fossil subduction zone. Requires verification.',
    };
  }
  if ((dt.includes('sedex') || dt.includes('sediment') || dt.includes('stratabound')) && (min === 'copper' || min === 'cobalt')) {
    return {
      label: 'Sedimentary basin / stratiform Cu-Co belt',
      note:  'Possible related geologic environment: sediment-hosted stratiform copper-cobalt in Neoproterozoic or Palaeoproterozoic basin sequences. Requires verification.',
    };
  }
  if (dt.includes('carbonatite') || min === 'rare earths') {
    return {
      label: 'Carbonatite / alkaline intrusion',
      note:  'Possible related geologic environment: REE-enriched carbonatite or alkaline igneous province. REE enrichment tied to mantle-derived magmatism. Requires verification.',
    };
  }
  if (dt.includes('magmatic') || dt.includes('sulphide') || dt.includes('komatiite') || min === 'nickel') {
    return {
      label: 'Mafic-ultramafic belt / magmatic sulphide system',
      note:  'Possible related geologic environment: Ni-Cu-PGE magmatic sulphide hosted in layered intrusion, komatiite, or flood basalt setting. Requires verification.',
    };
  }
  if (dt.includes('laterite')) {
    return {
      label: 'Tropical weathering profile / laterite nickel',
      note:  'Possible related geologic environment: deep lateritic weathering of ultramafic basement in tropical or subtropical setting. Requires verification.',
    };
  }
  if (dt.includes('iocg')) {
    return {
      label: 'Iron oxide copper-gold (IOCG) province',
      note:  'Possible related geologic environment: IOCG system related to crustal-scale faults and hydrothermal fluid flow in ancient cratons. Requires verification.',
    };
  }
  return {
    label: dep.paleo_setting || 'Geologic context not classified',
    note:  'Paleo-geologic environment requires additional source-backed assessment. Do not rely on this classification for resource decisions.',
  };
}

// ── Helper ─────────────────────────────────────────────────────
const mc = (m: string) => MINERAL_COLOR[m] || '#94a3b8';

// ── All deposits ───────────────────────────────────────────────
export const DEPOSITS: Deposit[] = [

  // ═══════════════════════════════════════════════════
  // AFRICA
  // ═══════════════════════════════════════════════════

  {
    id:'ken', name:'Kenticha Lithium-Tantalum',
    country:'Ethiopia', region:'Oromia Region',
    latitude:5.5800, longitude:39.7300,
    primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:45000000, grade_percent:1.08, grade_unit:'% Li₂O',
    owner:'EMDSC (state)', operator:'Ethiopian Min. Dev. Corp',
    opportunity_score:70, difficulty_score:63, underutilization_score:82,
    infrastructure_score:32, country_risk_score:65, environmental_risk_score:42,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:4,
    paleo_setting:'Mozambique Belt Neoproterozoic pegmatite province — East African Orogen, collision-related LCT pegmatites',
    ai_summary:"Pegmatite-hosted lithium and tantalum potential offers regional growth optionality. Infrastructure, resource definition, and financing depth will determine development velocity.",
    flags:['underutilized','east_africa'],
  },
  {
    id:'bik', name:'Bikita Lithium Mine',
    country:'Zimbabwe', region:'Masvingo Province',
    latitude:-20.1000, longitude:31.6700,
    primary_mineral:'Lithium', secondary_minerals:['Tantalum','Tin','Caesium'],
    deposit_type:'LCT Pegmatite', status:'producing', development_stage:'production',
    resource_size_tonnes:11000000, grade_percent:1.42, grade_unit:'% Li₂O',
    owner:'Sinomine Resource Group', operator:'Bikita Minerals',
    opportunity_score:72, difficulty_score:58, underutilization_score:35,
    infrastructure_score:45, country_risk_score:72, environmental_risk_score:30,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:5,
    paleo_setting:'Archaean Zimbabwe Craton — one of oldest known Li pegmatite complexes globally, hosted in Archean greenstone terrane',
    ai_summary:"One of the longest-operating lithium mines globally. Sinomine acquisition 2022 accelerating processing expansion. Complex multi-mineral pegmatite with Cs, Ta, Sn byproducts. Zimbabwe jurisdiction risk elevated.",
    flags:['chinese_acquisition','africa','historic_mine'],
  },
  {
    id:'man', name:'Manono Lithium-Tin Project',
    country:'DR Congo', region:'Tanganyika Province',
    latitude:-7.3000, longitude:27.4167,
    primary_mineral:'Lithium', secondary_minerals:['Tin','Tantalum','Niobium'],
    deposit_type:'LCT Pegmatite', status:'exploration', development_stage:'pre_feasibility',
    resource_size_tonnes:401000000, grade_percent:1.65, grade_unit:'% Li₂O',
    owner:'AVZ Minerals (disputed)', operator:'AVZ / Zijin (contested)',
    opportunity_score:70, difficulty_score:90, underutilization_score:95,
    infrastructure_score:15, country_risk_score:95, environmental_risk_score:45,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:4,
    paleo_setting:'Proterozoic Kibaran Belt — giant LCT spodumene pegmatite hosted in metasedimentary terrain, East-Central Africa',
    ai_summary:"Potentially the world's largest hard rock lithium deposit by resource size. Ownership dispute between AVZ and Zijin Mining is active. 3000km from coast, no paved road, no grid power — infrastructure is the critical constraint.",
    flags:['ownership_dispute','country_risk_flag','world_class_potential'],
  },
  {
    id:'tf', name:'Tenke Fungurume',
    country:'DR Congo', region:'Lualaba Province',
    latitude:-10.5833, longitude:26.1167,
    primary_mineral:'Cobalt', secondary_minerals:['Copper'],
    deposit_type:'Sediment-Hosted Stratiform', status:'producing', development_stage:'production',
    resource_size_tonnes:1450000000, grade_percent:0.38, grade_unit:'% Co',
    owner:'CMOC 80% / Gécamines 20%', operator:'CMOC Group',
    opportunity_score:85, difficulty_score:72, underutilization_score:22,
    infrastructure_score:38, country_risk_score:88, environmental_risk_score:55,
    data_confidence:'high', mineral_color:mc('Cobalt'), source_count:9,
    paleo_setting:'Neoproterozoic Katangan Basin, Central African Copperbelt — Roan Group stratabound Cu-Co ore shales',
    ai_summary:"High-grade cobalt operation acquired by CMOC from Freeport-McMoRan 2016. DRC political risk and export levy disputes are persistent headwinds. Critical node in global battery cobalt supply.",
    flags:['cobalt_critical','country_risk_flag'],
  },
  {
    id:'kak', name:'Kamoa-Kakula Copper Mine',
    country:'DR Congo', region:'Lualaba Province',
    latitude:-10.8700, longitude:26.0200,
    primary_mineral:'Copper', secondary_minerals:['Cobalt','Silver'],
    deposit_type:'Sediment-Hosted Stratiform', status:'producing', development_stage:'expansion',
    resource_size_tonnes:15900000000, grade_percent:5.57, grade_unit:'%',
    owner:'Ivanhoe Mines 39.6% / Zijin 39.6% / DRC Govt 20%', operator:'Ivanhoe Mines / Zijin',
    opportunity_score:91, difficulty_score:65, underutilization_score:30,
    infrastructure_score:52, country_risk_score:85, environmental_risk_score:50,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:12,
    paleo_setting:'Neoproterozoic Katangan Basin — ultra-high-grade stratabound Cu in Roan Group sandstones and shales. Same basin as Kolwezi and Tenke.',
    ai_summary:"Highest-grade major copper mine in the world at 5.57% Cu. Phase 3 expansion targets 600ktpa Cu. World-class asset constrained only by DRC sovereign risk, logistics, and power availability.",
    flags:['world_class','highest_grade_cu','expansion_potential'],
  },
  {
    id:'kol', name:'Kolwezi Copper-Cobalt District',
    country:'DR Congo', region:'Lualaba Province',
    latitude:-10.7167, longitude:25.4667,
    primary_mineral:'Cobalt', secondary_minerals:['Copper'],
    deposit_type:'SEDEX / Sediment-Hosted', status:'producing', development_stage:'production',
    resource_size_tonnes:2800000000, grade_percent:0.65, grade_unit:'% Co',
    owner:'Glencore (dominant)', operator:'Glencore / multiple',
    opportunity_score:83, difficulty_score:78, underutilization_score:28,
    infrastructure_score:35, country_risk_score:90, environmental_risk_score:58,
    data_confidence:'medium', mineral_color:mc('Cobalt'), source_count:8,
    paleo_setting:'Neoproterozoic Katangan Copperbelt — stratabound sulphide in Roan Group carbonates and shales',
    ai_summary:"Kolwezi district anchors DRC cobalt production. Glencore Mutanda and Kamoto are primary operations. ASM artisanal mining overlap creates persistent human rights due diligence burden.",
    flags:['asm_overlap','cobalt_critical','country_risk_flag'],
  },
  {
    id:'bou', name:'Bou Azzer Cobalt Mine',
    country:'Morocco', region:'Drâa-Tafilalet',
    latitude:30.5167, longitude:-6.5000,
    primary_mineral:'Cobalt', secondary_minerals:['Nickel','Arsenic','Gold'],
    deposit_type:'Hydrothermal Vein / Ophiolite', status:'producing', development_stage:'production',
    resource_size_tonnes:12000000, grade_percent:0.8, grade_unit:'% Co',
    owner:'CTT Mines (Managem Group)', operator:'CTT Mines',
    opportunity_score:68, difficulty_score:44, underutilization_score:40,
    infrastructure_score:60, country_risk_score:28, environmental_risk_score:35,
    data_confidence:'medium', mineral_color:mc('Cobalt'), source_count:5,
    paleo_setting:'Proterozoic Anti-Atlas Belt — Precambrian ophiolite complex hosting Co-Ni-As vein mineralisation in serpentinised ultramafics',
    ai_summary:"World's oldest continuously mined cobalt deposit. Managem Group (OCP subsidiary) operator. Ophiolite-hosted vein style is geologically distinct from DRC stratabound deposits. Solid jurisdiction, limited scale.",
    flags:['africa','historic_mine','ophiolite_hosted'],
  },
  {
    id:'tnv', name:'Tantalite Valley',
    country:'Namibia', region:'Karas Region',
    latitude:-28.5000, longitude:17.8000,
    primary_mineral:'Tantalum', secondary_minerals:['Lithium','Niobium'],
    deposit_type:'LCT Pegmatite', status:'exploration', development_stage:'early_exploration',
    resource_size_tonnes:8000000, grade_percent:0.018, grade_unit:'% Ta₂O₅',
    owner:'Namibia Critical Metals', operator:'Namibia Critical Metals',
    opportunity_score:61, difficulty_score:48, underutilization_score:88,
    infrastructure_score:42, country_risk_score:20, environmental_risk_score:32,
    data_confidence:'low', mineral_color:mc('Tantalum'), source_count:3,
    paleo_setting:'Damara Belt Neoproterozoic pegmatite province — collision orogen LCT pegmatites in Namibia-Botswana crustal block',
    ai_summary:"Early-stage tantalum-lithium pegmatite in a stable, low-risk African jurisdiction. Limited data confidence. Namibia's mining framework is one of the most investor-friendly in Africa.",
    flags:['africa','early_stage','stable_jurisdiction'],
  },
  {
    id:'zulu', name:'Zulu Lithium Project',
    country:'Zimbabwe', region:'Matabeleland South',
    latitude:-21.3000, longitude:29.0000,
    primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'exploration', development_stage:'advanced_exploration',
    resource_size_tonnes:35000000, grade_percent:1.1, grade_unit:'% Li₂O',
    owner:'Premier African Minerals', operator:'Premier African Minerals',
    opportunity_score:65, difficulty_score:60, underutilization_score:85,
    infrastructure_score:38, country_risk_score:70, environmental_risk_score:30,
    data_confidence:'low', mineral_color:mc('Lithium'), source_count:3,
    paleo_setting:'Zimbabwe Craton Archaean greenstone belt margins — LCT pegmatite province related to late-stage crustal differentiation',
    ai_summary:"Advancing lithium pegmatite project in Zimbabwe's emerging lithium corridor. Jurisdiction risk elevated but improving. Resource definition drilling ongoing.",
    flags:['africa','emerging_producer'],
  },
  {
    id:'ewo', name:'Ewoyaa Lithium Project',
    country:'Ghana', region:'Central Region',
    latitude:5.3100, longitude:-0.9600,
    primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:35700000, grade_percent:1.26, grade_unit:'% Li₂O',
    owner:'Atlantic Lithium / Piedmont Lithium', operator:'Atlantic Lithium',
    opportunity_score:73, difficulty_score:50, underutilization_score:80,
    infrastructure_score:58, country_risk_score:25, environmental_risk_score:40,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:6,
    paleo_setting:'Birimian Proterozoic terrane — West African Craton, greenstone belt-hosted LCT pegmatites near coast of Gulf of Guinea',
    ai_summary:"One of West Africa's most significant lithium discoveries. Near coastal infrastructure (Port of Takoradi ~100km). Ghana is a stable mining jurisdiction. Piedmont Lithium (US) strategic partnership provides North American offtake optionality.",
    flags:['africa','west_africa','stable_jurisdiction','port_access'],
  },
  {
    id:'gou', name:'Goulamina Lithium Project',
    country:'Mali', region:'Bougouni District',
    latitude:11.1700, longitude:-7.4700,
    primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'construction', development_stage:'construction',
    resource_size_tonnes:103600000, grade_percent:1.43, grade_unit:'% Li₂O',
    owner:'Ganfeng Lithium 50% / Lithium du Mali 50%', operator:'Goulamina Lithium SA',
    opportunity_score:74, difficulty_score:68, underutilization_score:65,
    infrastructure_score:35, country_risk_score:78, environmental_risk_score:42,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:7,
    paleo_setting:'Birimian Proterozoic West African Craton — greenstone belt pegmatite province, southern Mali basement terrane',
    ai_summary:"Large-scale hard rock lithium project under construction. Ganfeng Lithium (China) holds 50% stake. Mali security situation (post-coup 2021) is the primary risk. Construction proceeding despite political transition.",
    flags:['africa','west_africa','construction_stage','political_risk','chinese_jv'],
  },
  {
    id:'ngu', name:'Ngualla Rare Earth Project',
    country:'Tanzania', region:'Singida Region',
    latitude:-8.4333, longitude:33.0833,
    primary_mineral:'Rare Earths', secondary_minerals:['Fluorite'],
    deposit_type:'Carbonatite', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:888000000, grade_percent:2.89, grade_unit:'% TREO',
    owner:'Peak Rare Earths / Shenghe Resources', operator:'Peak Rare Earths',
    opportunity_score:72, difficulty_score:55, underutilization_score:88,
    infrastructure_score:35, country_risk_score:42, environmental_risk_score:38,
    data_confidence:'medium', mineral_color:mc('Rare Earths'), source_count:5,
    paleo_setting:'East African Rift-related alkaline-carbonatite complex — Neogene to Recent alkaline volcanism hosting REE-fluorite mineralisation',
    ai_summary:"High-grade carbonatite-hosted REE deposit with strong NdPr content relevant to permanent magnet supply chain. Shenghe Resources (Chinese) strategic partner provides processing expertise. Tanzania permitting environment improving post-2021 Samia government.",
    flags:['africa','east_africa','ree_critical'],
  },
  {
    id:'sks', name:'Steenkampskraal Rare Earths',
    country:'South Africa', region:'Western Cape',
    latitude:-30.8500, longitude:19.6000,
    primary_mineral:'Rare Earths', secondary_minerals:['Thorium','Fluorite'],
    deposit_type:'Carbonatite / Metamorphic Vein', status:'past_producing', development_stage:'feasibility',
    resource_size_tonnes:590000, grade_percent:14.4, grade_unit:'% TREO',
    owner:'Steenkampskraal Monazite Mine (Pty)', operator:'Steenkampskraal Holdings',
    opportunity_score:69, difficulty_score:52, underutilization_score:78,
    infrastructure_score:65, country_risk_score:28, environmental_risk_score:55,
    data_confidence:'medium', mineral_color:mc('Rare Earths'), source_count:5,
    paleo_setting:'Namaqualand Metamorphic Complex — Paleoproterozoic high-grade metamorphic terrane with remobilised REE-monazite veins',
    ai_summary:"Exceptionally high-grade monazite deposit, historically mined 1952–1963. Thorium byproduct creates regulatory complexity. Excellent jurisdiction. Potential Western strategic REE supply from South Africa.",
    flags:['africa','southern_africa','high_grade','thorium_liability'],
  },
  {
    id:'mku', name:'Makuutu Rare Earths Project',
    country:'Uganda', region:'Buyende District',
    latitude:1.2500, longitude:33.2000,
    primary_mineral:'Rare Earths', secondary_minerals:['Scandium'],
    deposit_type:'Ionic Clay (Laterite REE)', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:270000000, grade_percent:0.049, grade_unit:'% TREO',
    owner:'Rwenzori Rare Metals / Jervois Mining', operator:'Rwenzori Rare Metals',
    opportunity_score:64, difficulty_score:52, underutilization_score:90,
    infrastructure_score:30, country_risk_score:45, environmental_risk_score:50,
    data_confidence:'low', mineral_color:mc('Rare Earths'), source_count:3,
    paleo_setting:'East African Craton — weathered Archean basement producing ionic clay-style REE analogous to South Chinese deposits',
    ai_summary:"Ionic adsorption clay REE deposit — rare outside China. Low-cost heap leach extraction potential. Scandium byproduct adds value. Uganda infrastructure and power access are key development constraints.",
    flags:['africa','east_africa','ionic_clay','novel_deposit_type'],
  },
  {
    id:'kab', name:'Kabanga Nickel Project',
    country:'Tanzania', region:'Kagera Region',
    latitude:-2.6600, longitude:30.2000,
    primary_mineral:'Nickel', secondary_minerals:['Cobalt','Copper','Platinum Group Metals'],
    deposit_type:'Magmatic Sulphide (Komatiite)', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:58000000, grade_percent:2.62, grade_unit:'% Ni',
    owner:'Kabanga Nickel Ltd / BHP (strategic interest)', operator:'Kabanga Nickel Ltd',
    opportunity_score:78, difficulty_score:58, underutilization_score:88,
    infrastructure_score:28, country_risk_score:42, environmental_risk_score:45,
    data_confidence:'high', mineral_color:mc('Nickel'), source_count:8,
    paleo_setting:'Archaean Kibaran Belt, East African Orogen — komatiite-hosted magmatic Ni-Cu-PGE sulphide analogous to Canadian and Australian nickel systems',
    ai_summary:"World-class high-grade nickel sulphide deposit, one of the largest undeveloped globally. BHP strategic involvement signals major-miner interest. Remote western Tanzania location requires significant infrastructure investment. High confidence data from extensive historical drilling.",
    flags:['africa','east_africa','world_class','high_grade','bhp_interest'],
  },

  // ═══════════════════════════════════════════════════
  // GLOBAL ANCHORS
  // ═══════════════════════════════════════════════════

  {
    id:'gb', name:'Greenbushes Lithium Mine',
    country:'Australia', region:'Western Australia',
    latitude:-33.8536, longitude:116.0747,
    primary_mineral:'Lithium', secondary_minerals:['Tantalum','Tin'],
    deposit_type:'LCT Pegmatite', status:'producing', development_stage:'production',
    resource_size_tonnes:286000000, grade_percent:2.1, grade_unit:'% Li₂O',
    owner:'Talison (ALB 49% / SQM 25% / Tianqi 26%)', operator:'Talison Lithium',
    opportunity_score:92, difficulty_score:34, underutilization_score:18,
    infrastructure_score:95, country_risk_score:12, environmental_risk_score:28,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:18,
    paleo_setting:'Paleoproterozoic Balingup Metamorphic Belt, Yilgarn Craton — benchmark LCT spodumene pegmatite at ~2.5 Ga',
    ai_summary:"World's largest and highest-grade operating lithium mine. 286Mt @ 2.1% Li₂O. CGP3 chemical grade plant commissioning 2025. Near fully utilised — low underutilization. Benchmark global asset.",
    flags:['world_class','high_priority'],
  },
  {
    id:'pil', name:'Pilgangoora (Pilbara Minerals)',
    country:'Australia', region:'Western Australia',
    latitude:-21.3333, longitude:118.6833,
    primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'producing', development_stage:'expansion',
    resource_size_tonnes:308000000, grade_percent:1.13, grade_unit:'% Li₂O',
    owner:'Pilbara Minerals (ASX: PLS)', operator:'Pilbara Minerals',
    opportunity_score:82, difficulty_score:35, underutilization_score:38,
    infrastructure_score:80, country_risk_score:12, environmental_risk_score:22,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:8,
    paleo_setting:'Archaean Pilbara Craton — metasediment-hosted LCT pegmatite suite in Pilbara terrane',
    ai_summary:"One of world's largest hard rock lithium deposits. P1000 expansion to 1Mtpa spodumene concentrate underway. ~200km to Port Hedland. Strong ESG credentials.",
    flags:['expansion_potential'],
  },
  {
    id:'at', name:'Salar de Atacama',
    country:'Chile', region:'Antofagasta Region',
    latitude:-23.4833, longitude:-68.2667,
    primary_mineral:'Lithium', secondary_minerals:['Potassium','Boron'],
    deposit_type:'Brine (Salar)', status:'producing', development_stage:'production',
    resource_size_tonnes:9800000000, grade_percent:0.157, grade_unit:'% Li (brine)',
    owner:'SQM / Albemarle', operator:'SQM / Albemarle',
    opportunity_score:91, difficulty_score:38, underutilization_score:14,
    infrastructure_score:72, country_risk_score:28, environmental_risk_score:68,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:14,
    paleo_setting:'Neogene closed-basin brine system — Andean volcanic arc-fed halite-dominated salar at 2300m elevation, Atacama Basin',
    ai_summary:"World's largest lithium brine operation and highest brine grade globally. Water usage in hyperarid environment and indigenous Atacameño community water rights are the dominant risk factors.",
    flags:['world_class','water_risk'],
  },
  {
    id:'th', name:'Thacker Pass (Peehee Mu\'huh)',
    country:'United States', region:'Nevada',
    latitude:41.8483, longitude:-118.0594,
    primary_mineral:'Lithium', secondary_minerals:['Sulphur'],
    deposit_type:'Sedimentary Claystone', status:'construction', development_stage:'construction',
    resource_size_tonnes:13700000, grade_percent:0.35, grade_unit:'% Li',
    owner:'Lithium Americas / General Motors', operator:'Lithium Americas Corp',
    opportunity_score:76, difficulty_score:55, underutilization_score:72,
    infrastructure_score:65, country_risk_score:8, environmental_risk_score:58,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:7,
    paleo_setting:'Miocene McDermitt Caldera lacustrine basin — volcanic ash-derived lithium smectite clay deposit, Oregon-Nevada border',
    ai_summary:"Largest known lithium resource in the USA. GM $650M strategic investment. Novel acid-leach clay process not yet proven at commercial scale. Native American Paiute-Shoshone ancestral site — active legal and cultural contestation.",
    flags:['construction_stage','indigenous_rights','strategic_usa'],
  },
  {
    id:'esc', name:'Escondida',
    country:'Chile', region:'Antofagasta Region',
    latitude:-24.2667, longitude:-69.0667,
    primary_mineral:'Copper', secondary_minerals:['Gold','Silver','Molybdenum'],
    deposit_type:'Porphyry Copper', status:'producing', development_stage:'production',
    resource_size_tonnes:32400000000, grade_percent:0.44, grade_unit:'%',
    owner:'BHP 57.5% / Rio Tinto 30%', operator:'BHP Billiton Minerals',
    opportunity_score:89, difficulty_score:30, underutilization_score:12,
    infrastructure_score:80, country_risk_score:28, environmental_risk_score:42,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:12,
    paleo_setting:'Paleocene-Eocene Domeyko Cordillera porphyry belt — supergene enrichment over primary sulphide resource',
    ai_summary:"World's largest copper mine, contributing ~5% of global supply. Sulphide and oxide ore treated via concentrator and SX-EW. Desalination plant at Coloso eliminates freshwater dependency.",
    flags:['world_class','high_priority'],
  },
  {
    id:'oyu', name:'Oyu Tolgoi (Hugo Dummett)',
    country:'Mongolia', region:'South Gobi Province',
    latitude:43.0000, longitude:107.1100,
    primary_mineral:'Copper', secondary_minerals:['Gold','Silver'],
    deposit_type:'Porphyry Copper-Gold', status:'producing', development_stage:'expansion',
    resource_size_tonnes:20800000000, grade_percent:0.62, grade_unit:'%',
    owner:'Rio Tinto 66% / Mongolian Govt 34%', operator:'Rio Tinto / Turquoise Hill',
    opportunity_score:84, difficulty_score:58, underutilization_score:40,
    infrastructure_score:55, country_risk_score:50, environmental_risk_score:35,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:11,
    paleo_setting:'Palaeozoic Central Asian Orogenic Belt — Carboniferous porphyry copper-gold system in Gurvansaikhan Terrane',
    ai_summary:"One of world's largest copper-gold deposits. Underground Hugo Dummett block cave is transformative expansion. Rio Tinto and Mongolian government relations complex but stable. Water scarce Gobi Desert environment.",
    flags:['world_class','underground_expansion'],
  },
  {
    id:'by', name:'Bayan Obo REE-Iron Mine',
    country:'China', region:'Inner Mongolia',
    latitude:41.8014, longitude:109.9742,
    primary_mineral:'Rare Earths', secondary_minerals:['Iron','Niobium','Fluorite'],
    deposit_type:'Carbonatite', status:'producing', development_stage:'production',
    resource_size_tonnes:1500000000, grade_percent:6.2, grade_unit:'% REO',
    owner:'Baogang Group (state-owned)', operator:'Baotou Steel (Baogang)',
    opportunity_score:87, difficulty_score:55, underutilization_score:30,
    infrastructure_score:85, country_risk_score:45, environmental_risk_score:60,
    data_confidence:'medium', mineral_color:mc('Rare Earths'), source_count:7,
    paleo_setting:'Proterozoic North China Craton margin — Devonian carbonatite-related REE mineralisation overprinting Precambrian supracrustals',
    ai_summary:"World's largest REE deposit, supplying ~60% of global rare earth output. State-controlled — Western supply chain access is indirect. Thorium radioactive tailings management is a long-term liability.",
    flags:['world_class','geopolitical_risk','supply_chain_concentration'],
  },
  {
    id:'jad', name:'Jadar Lithium-Boron Project',
    country:'Serbia', region:'Jadar Valley',
    latitude:44.1667, longitude:19.5167,
    primary_mineral:'Lithium', secondary_minerals:['Boron'],
    deposit_type:'Sedimentary (Jadarite mineral)', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:55000000, grade_percent:1.8, grade_unit:'% Li₂O equiv.',
    owner:'Rio Tinto', operator:'Rio Tinto Serbia',
    opportunity_score:79, difficulty_score:62, underutilization_score:80,
    infrastructure_score:72, country_risk_score:38, environmental_risk_score:65,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:8,
    paleo_setting:'Miocene continental rift basin — unique jadarite mineral (LiNaSiB₃O₇(OH)) found only at this locality; no known analogue globally',
    ai_summary:"Potentially Europe's largest lithium deposit. Unique jadarite mineral requires bespoke processing. Rio Tinto license revoked 2022 under public pressure, partially reinstated 2024. High strategic value for European battery supply chain.",
    flags:['unique_mineral','europe_supply_chain','permitting_contested'],
  },
  {
    id:'voi', name:"Voisey's Bay Nickel-Cobalt Mine",
    country:'Canada', region:'Labrador',
    latitude:56.3667, longitude:-61.7500,
    primary_mineral:'Nickel', secondary_minerals:['Cobalt','Copper'],
    deposit_type:'Magmatic Sulphide', status:'producing', development_stage:'expansion',
    resource_size_tonnes:137000000, grade_percent:2.83, grade_unit:'% Ni',
    owner:'Vale S.A.', operator:'Vale Canada',
    opportunity_score:80, difficulty_score:48, underutilization_score:35,
    infrastructure_score:62, country_risk_score:10, environmental_risk_score:50,
    data_confidence:'high', mineral_color:mc('Nickel'), source_count:9,
    paleo_setting:'Proterozoic Nain Igneous Province — mafic-ultramafic intrusion-hosted Ni-Cu-Co sulphide in Labrador tectonic terrane',
    ai_summary:"High-grade Ni-Co sulphide mine in remote Arctic Labrador. Vale Long Harbour hydromet refinery in Newfoundland processes concentrate directly to finished metal. Underground expansion adding significant resource.",
    flags:['high_grade','cobalt_byproduct','arctic_logistics'],
  },
  {
    id:'nor', name:'Norilsk Nickel (Oktyabrskoye)',
    country:'Russia', region:'Krasnoyarsk Krai',
    latitude:69.3500, longitude:88.2000,
    primary_mineral:'Nickel', secondary_minerals:['Copper','Palladium','Platinum','Cobalt'],
    deposit_type:'Magmatic Sulphide (Flood Basalt)', status:'producing', development_stage:'production',
    resource_size_tonnes:2100000000, grade_percent:1.77, grade_unit:'% Ni',
    owner:'Nornickel (Norilsk Nickel)', operator:'Nornickel',
    opportunity_score:72, difficulty_score:70, underutilization_score:20,
    infrastructure_score:65, country_risk_score:85, environmental_risk_score:70,
    data_confidence:'medium', mineral_color:mc('Nickel'), source_count:6,
    paleo_setting:'Siberian Traps Large Igneous Province (~252 Ma) — world\'s largest flood basalt event hosting Ni-Cu-PGE in Norilsk-Talnakh intrusions',
    ai_summary:"World's largest Ni and Pd producer. Post-2022 sanctions significantly restrict Western investment and offtake. Critical supplier of palladium and platinum for catalytic converters and hydrogen fuel cells. Environmental record at Norilsk is poor.",
    flags:['world_class','sanctions_risk','pgm_critical'],
  },
  {
    id:'su', name:'Sudbury Basin',
    country:'Canada', region:'Ontario',
    latitude:46.5000, longitude:-81.0000,
    primary_mineral:'Nickel', secondary_minerals:['Copper','Cobalt','Platinum Group Metals'],
    deposit_type:'Magmatic Sulphide (Impact Melt)', status:'producing', development_stage:'production',
    resource_size_tonnes:1800000000, grade_percent:1.3, grade_unit:'% Ni',
    owner:'Glencore / Vale / KGHM', operator:'Multiple operators',
    opportunity_score:80, difficulty_score:40, underutilization_score:20,
    infrastructure_score:88, country_risk_score:10, environmental_risk_score:35,
    data_confidence:'high', mineral_color:mc('Nickel'), source_count:15,
    paleo_setting:'1.85 Ga Sudbury Igneous Complex — meteorite impact melt sheet producing giant magmatic Ni-Cu-PGE sulphide camp in Superior Province',
    ai_summary:"World's largest Ni-Cu-PGE sulphide district with 140+ years of continuous production. Multiple operators. Excellent infrastructure and jurisdiction. Nickel Rim South (Glencore) is the primary active mine.",
    flags:['world_class','mature_district'],
  },
  {
    id:'od', name:'Olympic Dam',
    country:'Australia', region:'South Australia',
    latitude:-30.4436, longitude:136.8861,
    primary_mineral:'Copper', secondary_minerals:['Uranium','Gold','Silver','Rare Earths'],
    deposit_type:'IOCG', status:'producing', development_stage:'expansion',
    resource_size_tonnes:10100000000, grade_percent:0.72, grade_unit:'%',
    owner:'BHP', operator:'BHP',
    opportunity_score:86, difficulty_score:48, underutilization_score:55,
    infrastructure_score:70, country_risk_score:12, environmental_risk_score:35,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:11,
    paleo_setting:'Mesoproterozoic Gawler Craton — IOCG system at ~1.59 Ga related to Hiltaba Suite granites and Olympic Dam Formation brecciation',
    ai_summary:"World's largest known uranium deposit and 4th largest copper. Highly polymetallic. BHP expansion (OD Expansion) targets 650ktpa Cu by early 2030s. 60km purpose-built rail spur to Port Augusta.",
    flags:['world_class','expansion_potential','iocg_system'],
  },
  {
    id:'cj', name:'Carajás Province',
    country:'Brazil', region:'Pará State',
    latitude:-6.0667, longitude:-50.1833,
    primary_mineral:'Copper', secondary_minerals:['Nickel','Iron','Gold'],
    deposit_type:'IOCG / BIF', status:'producing', development_stage:'production',
    resource_size_tonnes:7200000000, grade_percent:0.92, grade_unit:'%',
    owner:'Vale S.A.', operator:'Vale S.A.',
    opportunity_score:84, difficulty_score:42, underutilization_score:28,
    infrastructure_score:72, country_risk_score:35, environmental_risk_score:48,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:10,
    paleo_setting:'Archaean Carajás Domain, Amazon Craton — Neoarchean IOCG hydrothermal and BIF-hosted iron system in Itacaiúnas Supergroup',
    ai_summary:"Carajás is among the world's most significant mineral provinces — highest-grade iron ore globally, major copper (Sossego/Salobo), and nickel. Vale's core asset. Amazon Basin logistics complexity.",
    flags:['world_class','multi_mineral'],
  },
];

// ── Africa helper ──────────────────────────────────────────────
const AFRICA_COUNTRIES = new Set([
  'Ethiopia','Zimbabwe','DR Congo','Morocco','Namibia','Ghana','Mali',
  'Tanzania','South Africa','Uganda','Nigeria','Mozambique','Zambia',
  'Kenya','Botswana','Senegal','Guinea','Burkina Faso','Niger','Sudan',
  'Egypt','Algeria','Tunisia','Libya','Somalia','Rwanda','Burundi',
  'Angola','Cameroon','Gabon','Congo','Madagascar',
]);

export function isAfrica(dep: Deposit): boolean {
  return AFRICA_COUNTRIES.has(dep.country);
}

// ── KPI calculator ─────────────────────────────────────────────
export function computeKPIs(deposits: Deposit[]): KPIs {
  const total      = deposits.length;
  const producing  = deposits.filter(d => d.status === 'producing').length;
  const undeveloped = deposits.filter(d => ['undeveloped','exploration','feasibility','construction'].includes(d.status)).length;
  const countries  = new Set(deposits.map(d => d.country)).size;
  const minerals   = new Set(deposits.map(d => d.primary_mineral)).size;
  const highOpp    = deposits.filter(d => d.opportunity_score >= 75).length;
  const highConf   = deposits.filter(d => d.data_confidence === 'high').length;
  const avgOpp     = total > 0 ? Math.round(deposits.reduce((s,d) => s + d.opportunity_score, 0) / total) : 0;
  const african    = deposits.filter(d => isAfrica(d)).length;
  return { total_deposits:total, producing, undeveloped, countries_covered:countries, minerals_covered:minerals, high_opportunity:highOpp, high_confidence:highConf, avg_opportunity:avgOpp, african_deposits:african };
}
