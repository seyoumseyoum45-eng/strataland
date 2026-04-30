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
  { symbol:'Ta',  name:'Tantalum',     display_color:'#e8e8e8', iea_critical:true  },
];

export const MINERAL_COLOR: Record<string,string> = {
  Lithium:'#25f5a6', Copper:'#ff7a22', Cobalt:'#3f8cff',
  Nickel:'#27d8b2', 'Rare Earths':'#a855f7', Uranium:'#f6b93b',
  Graphite:'#94a3b8', Manganese:'#22d3ee', Tantalum:'#e8e8e8',
};

// ── Paleo context helper ───────────────────────────────────────
// Returns label + note. All notes explicitly flag uncertainty.
export function getPaleoContext(dep: Deposit): { label: string; note: string } {
  const dt  = dep.deposit_type.toLowerCase();
  const min = dep.primary_mineral.toLowerCase();
  if (dt.includes('pegmatite') && (min === 'lithium' || min === 'tantalum'))
    return { label:'Pegmatite belt / ancient crystalline basement',
      note:'Possible related geologic environment: rare-metal LCT pegmatite province in Proterozoic or Archean basement. Source-backed confidence required. Requires verification.' };
  if (dt.includes('brine') || dt.includes('salar'))
    return { label:'Closed-basin evaporite / arid highland basin',
      note:'Possible related geologic environment: Neogene closed-basin brine system in elevated plateau. Lithium sourced from volcanic arc or hydrothermal input. Requires verification.' };
  if (dt.includes('porphyry') && min === 'copper')
    return { label:'Magmatic arc / porphyry copper system',
      note:'Possible related geologic environment: calc-alkaline porphyry Cu associated with active or fossil subduction zone. Requires verification.' };
  if ((dt.includes('sedex') || dt.includes('sediment') || dt.includes('stratabound')) && (min === 'copper' || min === 'cobalt'))
    return { label:'Sedimentary basin / stratiform Cu-Co belt',
      note:'Possible related geologic environment: sediment-hosted stratiform Cu-Co in Neoproterozoic basin sequences. Requires verification.' };
  if (dt.includes('carbonatite') || min === 'rare earths')
    return { label:'Carbonatite / alkaline intrusion province',
      note:'Possible related geologic environment: REE-enriched carbonatite or alkaline igneous province tied to mantle-derived magmatism. Requires verification.' };
  if (dt.includes('laterite'))
    return { label:'Tropical weathering profile / laterite system',
      note:'Possible related geologic environment: deep lateritic weathering of ultramafic basement in tropical setting. Requires verification.' };
  if (dt.includes('iocg'))
    return { label:'Iron oxide copper-gold (IOCG) province',
      note:'Possible related geologic environment: IOCG system related to crustal-scale faults and hydrothermal fluid flow in ancient cratons. Requires verification.' };
  if (dt.includes('graphite') || min === 'graphite')
    return { label:'High-grade metamorphic graphite province',
      note:'Possible related geologic environment: graphite in high-grade Proterozoic or Archean metamorphic terrane. Requires verification.' };
  if (min === 'manganese')
    return { label:'Sedimentary manganese basin',
      note:'Possible related geologic environment: marine sedimentary manganese in Proterozoic or Paleozoic basin. Requires verification.' };
  if (min === 'uranium')
    return { label:'Unconformity / IOCG / sediment-hosted uranium system',
      note:'Possible related geologic environment: uranium in unconformity, sandstone, or IOCG setting. Requires verification.' };
  if (dt.includes('magmatic') || dt.includes('sulphide') || dt.includes('komatiite') || min === 'nickel')
    return { label:'Mafic-ultramafic belt / magmatic sulphide system',
      note:'Possible related geologic environment: Ni-Cu-PGE magmatic sulphide in layered intrusion or komatiite. Requires verification.' };
  return { label: dep.paleo_setting || 'Geologic context not classified',
    note:'Paleo-geologic environment requires additional source-backed assessment. Do not rely on this classification for resource decisions.' };
}

const mc = (m: string) => MINERAL_COLOR[m] || '#94a3b8';

// ──────────────────────────────────────────────────────────────────────────
// DEPOSIT DATASET — 65 records
// Sources: USGS MRDS, BGS World Mineral Statistics, public company filings,
// national geological surveys. Coordinates are approximate centroids.
// Confidence reflects public data availability as of 2024-Q4.
// status values: producing | past_producing | undeveloped | exploration |
//                feasibility | construction | care_and_maintenance | unknown
// All secondary_minerals arrays contain at least one real string (no '').
// ──────────────────────────────────────────────────────────────────────────
export const DEPOSITS: Deposit[] = [

  // ═══════════════════════════════════════════════════
  // AFRICA  (25 deposits)
  // ═══════════════════════════════════════════════════

  // Africa · Lithium

  { id:'ken', name:'Kenticha Lithium-Tantalum', country:'Ethiopia', region:'Oromia Region',
    latitude:6.90, longitude:39.20, primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:45000000, grade_percent:1.08, grade_unit:'% Li₂O',
    owner:'EMDSC (state)', operator:'Ethiopian Minerals Dev. Corp',
    opportunity_score:70, difficulty_score:63, underutilization_score:82,
    infrastructure_score:32, country_risk_score:65, environmental_risk_score:42,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:4,
    paleo_setting:'Mozambique Belt Neoproterozoic pegmatite province — East African Orogen collision-related LCT pegmatites',
    ai_summary:'Pegmatite-hosted Li-Ta potential in East Africa. Infrastructure, resource definition, and financing depth will determine development velocity.',
    flags:['east_africa','underutilized'] },

  { id:'bik', name:'Bikita Lithium Mine', country:'Zimbabwe', region:'Masvingo Province',
    latitude:-20.10, longitude:31.67, primary_mineral:'Lithium', secondary_minerals:['Tantalum','Tin','Caesium'],
    deposit_type:'LCT Pegmatite', status:'producing', development_stage:'production',
    resource_size_tonnes:11000000, grade_percent:1.42, grade_unit:'% Li₂O',
    owner:'Sinomine Resource Group', operator:'Bikita Minerals',
    opportunity_score:72, difficulty_score:58, underutilization_score:35,
    infrastructure_score:45, country_risk_score:72, environmental_risk_score:30,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:5,
    paleo_setting:'Archaean Zimbabwe Craton — one of oldest known Li pegmatite complexes, hosted in Archean greenstone terrane',
    ai_summary:'One of longest-operating lithium mines globally. Sinomine acquisition 2022 accelerating expansion. Complex multi-mineral pegmatite with Cs, Ta, Sn byproducts.',
    flags:['historic_mine','chinese_acquisition'] },

  { id:'man', name:'Manono Lithium-Tin Project', country:'DR Congo', region:'Tanganyika Province',
    latitude:-7.30, longitude:27.42, primary_mineral:'Lithium', secondary_minerals:['Tin','Tantalum','Niobium'],
    deposit_type:'LCT Pegmatite', status:'exploration', development_stage:'pre-feasibility',
    resource_size_tonnes:401000000, grade_percent:1.65, grade_unit:'% Li₂O',
    owner:'AVZ Minerals (disputed)', operator:'AVZ / Zijin (contested)',
    opportunity_score:70, difficulty_score:90, underutilization_score:95,
    infrastructure_score:15, country_risk_score:95, environmental_risk_score:45,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:4,
    paleo_setting:'Proterozoic Kibaran Belt — giant LCT spodumene pegmatite in metasedimentary terrain, East-Central Africa',
    ai_summary:'Potentially world\'s largest hard rock Li deposit. Ownership dispute active. 3000 km from coast, no paved road, no grid power — infrastructure is the binding constraint.',
    flags:['ownership_dispute','world_class_potential','country_risk_flag'] },

  { id:'zulu', name:'Zulu Lithium Project', country:'Zimbabwe', region:'Matabeleland South',
    latitude:-21.30, longitude:29.00, primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'exploration', development_stage:'advanced exploration',
    resource_size_tonnes:35000000, grade_percent:1.10, grade_unit:'% Li₂O',
    owner:'Premier African Minerals', operator:'Premier African Minerals',
    opportunity_score:65, difficulty_score:60, underutilization_score:85,
    infrastructure_score:38, country_risk_score:70, environmental_risk_score:30,
    data_confidence:'low', mineral_color:mc('Lithium'), source_count:3,
    paleo_setting:'Zimbabwe Craton Archaean greenstone belt margins — LCT pegmatite province related to late-stage crustal differentiation',
    ai_summary:'Advancing Li pegmatite in Zimbabwe\'s emerging lithium corridor. Jurisdiction risk elevated but improving. Resource definition drilling ongoing.',
    flags:['emerging_producer'] },

  { id:'ewo', name:'Ewoyaa Lithium Project', country:'Ghana', region:'Central Region',
    latitude:5.31, longitude:-0.96, primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:35700000, grade_percent:1.26, grade_unit:'% Li₂O',
    owner:'Atlantic Lithium / Piedmont Lithium', operator:'Atlantic Lithium',
    opportunity_score:73, difficulty_score:50, underutilization_score:80,
    infrastructure_score:58, country_risk_score:25, environmental_risk_score:40,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:6,
    paleo_setting:'Birimian Proterozoic terrane — West African Craton greenstone belt-hosted LCT pegmatites near Gulf of Guinea coast',
    ai_summary:'One of West Africa\'s most significant Li discoveries. Near Port of Takoradi. Ghana is a stable mining jurisdiction. Piedmont Lithium US partnership provides North American offtake optionality.',
    flags:['west_africa','stable_jurisdiction','port_access'] },

  { id:'gou', name:'Goulamina Lithium Project', country:'Mali', region:'Bougouni District',
    latitude:11.17, longitude:-7.47, primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'construction', development_stage:'construction',
    resource_size_tonnes:103600000, grade_percent:1.43, grade_unit:'% Li₂O',
    owner:'Ganfeng Lithium 50% / Lithium du Mali 50%', operator:'Goulamina Lithium SA',
    opportunity_score:74, difficulty_score:68, underutilization_score:65,
    infrastructure_score:35, country_risk_score:78, environmental_risk_score:42,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:7,
    paleo_setting:'Birimian Proterozoic West African Craton — greenstone belt pegmatite province, southern Mali basement terrane',
    ai_summary:'Large hard rock lithium project under construction. Ganfeng holds 50%. Mali post-coup 2021 situation is the primary risk factor. Construction proceeding despite political transition.',
    flags:['west_africa','construction_stage','political_risk','chinese_jv'] },

  { id:'arc', name:'Arcadia Lithium Project', country:'Zimbabwe', region:'Harare Province',
    latitude:-17.76, longitude:31.22, primary_mineral:'Lithium', secondary_minerals:['Tantalum','Petalite'],
    deposit_type:'LCT Pegmatite', status:'producing', development_stage:'production',
    resource_size_tonnes:72700000, grade_percent:1.07, grade_unit:'% Li₂O',
    owner:'Huayou Cobalt', operator:'Prospect Lithium Zimbabwe',
    opportunity_score:71, difficulty_score:55, underutilization_score:42,
    infrastructure_score:55, country_risk_score:68, environmental_risk_score:32,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:5,
    paleo_setting:'Zimbabwe Craton Archaean basement — petalite-spodumene-lepidolite LCT pegmatite near Harare',
    ai_summary:'Arcadia hosts petalite for glass-ceramics and spodumene for battery lithium. Huayou Cobalt acquisition 2022. Reasonable infrastructure near Harare.',
    flags:['chinese_acquisition','multi_product'] },

  // Africa · Cobalt & Copper

  { id:'tf', name:'Tenke Fungurume', country:'DR Congo', region:'Lualaba Province',
    latitude:-10.58, longitude:26.12, primary_mineral:'Cobalt', secondary_minerals:['Copper'],
    deposit_type:'Sediment-Hosted Stratiform', status:'producing', development_stage:'production',
    resource_size_tonnes:1450000000, grade_percent:0.38, grade_unit:'% Co',
    owner:'CMOC 80% / Gécamines 20%', operator:'CMOC Group',
    opportunity_score:85, difficulty_score:72, underutilization_score:22,
    infrastructure_score:38, country_risk_score:88, environmental_risk_score:55,
    data_confidence:'high', mineral_color:mc('Cobalt'), source_count:9,
    paleo_setting:'Neoproterozoic Katangan Basin — Roan Group stratabound Cu-Co ore shales, Central African Copperbelt',
    ai_summary:'High-grade cobalt operation. CMOC acquired from Freeport-McMoRan 2016. DRC political risk and export levy disputes are persistent headwinds. Critical node in global battery cobalt supply.',
    flags:['cobalt_critical','country_risk_flag'] },

  { id:'kak', name:'Kamoa-Kakula Copper Mine', country:'DR Congo', region:'Lualaba Province',
    latitude:-10.87, longitude:26.02, primary_mineral:'Copper', secondary_minerals:['Cobalt','Silver'],
    deposit_type:'Sediment-Hosted Stratiform', status:'producing', development_stage:'expansion',
    resource_size_tonnes:15900000000, grade_percent:5.57, grade_unit:'%',
    owner:'Ivanhoe Mines 39.6% / Zijin 39.6% / DRC Govt 20%', operator:'Ivanhoe Mines / Zijin',
    opportunity_score:91, difficulty_score:65, underutilization_score:30,
    infrastructure_score:52, country_risk_score:85, environmental_risk_score:50,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:12,
    paleo_setting:'Neoproterozoic Katangan Basin — ultra-high-grade stratabound Cu in Roan Group sandstones and shales',
    ai_summary:'Highest-grade major copper mine globally at 5.57% Cu. Phase 3 expansion targets 600 ktpa. World-class asset constrained by DRC sovereign risk, logistics, and power availability.',
    flags:['world_class','highest_grade_cu','expansion_potential'] },

  { id:'kol', name:'Kolwezi Copper-Cobalt District', country:'DR Congo', region:'Lualaba Province',
    latitude:-10.72, longitude:25.47, primary_mineral:'Cobalt', secondary_minerals:['Copper'],
    deposit_type:'SEDEX / Sediment-Hosted', status:'producing', development_stage:'production',
    resource_size_tonnes:2800000000, grade_percent:0.65, grade_unit:'% Co',
    owner:'Glencore (dominant)', operator:'Glencore / multiple',
    opportunity_score:83, difficulty_score:78, underutilization_score:28,
    infrastructure_score:35, country_risk_score:90, environmental_risk_score:58,
    data_confidence:'medium', mineral_color:mc('Cobalt'), source_count:8,
    paleo_setting:'Neoproterozoic Katangan Copperbelt — stratabound sulphide in Roan Group carbonates and shales',
    ai_summary:'Kolwezi anchors DRC cobalt production. Glencore Mutanda and Kamoto are primary operations. ASM artisanal mining overlap creates persistent human rights due diligence burden.',
    flags:['asm_overlap','cobalt_critical','country_risk_flag'] },

  { id:'mut', name:'Mutanda Copper-Cobalt Mine', country:'DR Congo', region:'Lualaba Province',
    latitude:-11.32, longitude:26.72, primary_mineral:'Cobalt', secondary_minerals:['Copper'],
    deposit_type:'Sediment-Hosted Stratiform', status:'producing', development_stage:'production',
    resource_size_tonnes:750000000, grade_percent:0.45, grade_unit:'% Co',
    owner:'Glencore', operator:'Glencore',
    opportunity_score:79, difficulty_score:74, underutilization_score:25,
    infrastructure_score:40, country_risk_score:88, environmental_risk_score:52,
    data_confidence:'medium', mineral_color:mc('Cobalt'), source_count:6,
    paleo_setting:'Katangan Basin stratabound Cu-Co — Roan Group ore shales, southern DRC Copperbelt',
    ai_summary:'Glencore flagship DRC cobalt operation. Care-and-maintenance 2019–2022, restarted 2023. One of world\'s largest cobalt producers by contained metal.',
    flags:['cobalt_critical','glencore'] },

  { id:'bou', name:'Bou Azzer Cobalt Mine', country:'Morocco', region:'Draa-Tafilalet',
    latitude:30.52, longitude:-6.50, primary_mineral:'Cobalt', secondary_minerals:['Nickel','Gold'],
    deposit_type:'Hydrothermal Vein / Ophiolite', status:'producing', development_stage:'production',
    resource_size_tonnes:12000000, grade_percent:0.80, grade_unit:'% Co',
    owner:'CTT Mines (Managem Group)', operator:'CTT Mines',
    opportunity_score:68, difficulty_score:44, underutilization_score:40,
    infrastructure_score:60, country_risk_score:28, environmental_risk_score:35,
    data_confidence:'medium', mineral_color:mc('Cobalt'), source_count:5,
    paleo_setting:'Proterozoic Anti-Atlas Belt — Precambrian ophiolite complex with Co-Ni-As vein mineralisation in serpentinised ultramafics',
    ai_summary:'World\'s oldest continuously mined cobalt deposit. Managem Group operator. Ophiolite-hosted vein style is geologically distinct from DRC stratabound deposits.',
    flags:['historic_mine','ophiolite_hosted'] },

  // Africa · Nickel

  { id:'kab', name:'Kabanga Nickel Project', country:'Tanzania', region:'Kagera Region',
    latitude:-2.66, longitude:30.20, primary_mineral:'Nickel', secondary_minerals:['Cobalt','Copper','PGMs'],
    deposit_type:'Magmatic Sulphide', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:58000000, grade_percent:2.62, grade_unit:'% Ni',
    owner:'Kabanga Nickel Ltd', operator:'Kabanga Nickel Ltd',
    opportunity_score:78, difficulty_score:58, underutilization_score:88,
    infrastructure_score:28, country_risk_score:42, environmental_risk_score:45,
    data_confidence:'high', mineral_color:mc('Nickel'), source_count:8,
    paleo_setting:'Archaean Kibaran Belt — komatiite-hosted magmatic Ni-Cu-PGE sulphide, East African Orogen',
    ai_summary:'World-class high-grade Ni sulphide, one of the largest undeveloped globally. BHP strategic interest. Remote western Tanzania requires significant infrastructure investment.',
    flags:['world_class','high_grade','bhp_interest','east_africa'] },

  // Africa · Rare Earths

  { id:'ngu', name:'Ngualla Rare Earth Project', country:'Tanzania', region:'Singida Region',
    latitude:-8.43, longitude:33.08, primary_mineral:'Rare Earths', secondary_minerals:['Fluorite'],
    deposit_type:'Carbonatite', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:888000000, grade_percent:2.89, grade_unit:'% TREO',
    owner:'Peak Rare Earths / Shenghe Resources', operator:'Peak Rare Earths',
    opportunity_score:72, difficulty_score:55, underutilization_score:88,
    infrastructure_score:35, country_risk_score:42, environmental_risk_score:38,
    data_confidence:'medium', mineral_color:mc('Rare Earths'), source_count:5,
    paleo_setting:'East African Rift-related alkaline-carbonatite complex — Neogene alkaline volcanism hosting REE-fluorite mineralisation',
    ai_summary:'High-grade carbonatite REE with strong NdPr content. Shenghe Resources strategic partner. Tanzania permitting environment improving post-2021.',
    flags:['east_africa','ree_critical'] },

  { id:'mku', name:'Makuutu Rare Earths Project', country:'Uganda', region:'Buyende District',
    latitude:1.25, longitude:33.20, primary_mineral:'Rare Earths', secondary_minerals:['Scandium'],
    deposit_type:'Ionic Clay (Laterite REE)', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:270000000, grade_percent:0.049, grade_unit:'% TREO',
    owner:'Rwenzori Rare Metals', operator:'Rwenzori Rare Metals',
    opportunity_score:64, difficulty_score:52, underutilization_score:90,
    infrastructure_score:30, country_risk_score:45, environmental_risk_score:50,
    data_confidence:'low', mineral_color:mc('Rare Earths'), source_count:3,
    paleo_setting:'East African Craton — weathered Archean basement producing ionic clay-style REE analogous to South Chinese deposits',
    ai_summary:'Ionic adsorption clay REE — rare outside China. Low-cost heap leach potential. Scandium byproduct adds value. Uganda infrastructure and power access are key constraints.',
    flags:['east_africa','ionic_clay','novel_deposit_type'] },

  { id:'sks', name:'Steenkampskraal Rare Earths', country:'South Africa', region:'Western Cape',
    latitude:-30.85, longitude:19.60, primary_mineral:'Rare Earths', secondary_minerals:['Thorium','Fluorite'],
    deposit_type:'Metamorphic Vein / Monazite', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:590000, grade_percent:14.40, grade_unit:'% TREO',
    owner:'Steenkampskraal Holdings', operator:'Steenkampskraal Holdings',
    opportunity_score:69, difficulty_score:52, underutilization_score:78,
    infrastructure_score:65, country_risk_score:28, environmental_risk_score:55,
    data_confidence:'medium', mineral_color:mc('Rare Earths'), source_count:5,
    paleo_setting:'Namaqualand Metamorphic Complex — Paleoproterozoic high-grade metamorphic terrane with remobilised REE-monazite veins',
    ai_summary:'Exceptionally high-grade monazite deposit, historically mined 1952–1963. Thorium byproduct creates regulatory complexity. Potential Western strategic REE supply from South Africa.',
    flags:['southern_africa','high_grade','thorium_liability'] },

  { id:'lof', name:'Lofdal Heavy Rare Earths', country:'Namibia', region:'Kunene Region',
    latitude:-20.55, longitude:13.92, primary_mineral:'Rare Earths', secondary_minerals:['Niobium'],
    deposit_type:'Carbonatite', status:'exploration', development_stage:'advanced exploration',
    resource_size_tonnes:49700000, grade_percent:0.076, grade_unit:'% TREO',
    owner:'Vital Metals', operator:'Vital Metals',
    opportunity_score:65, difficulty_score:50, underutilization_score:82,
    infrastructure_score:38, country_risk_score:18, environmental_risk_score:35,
    data_confidence:'low', mineral_color:mc('Rare Earths'), source_count:3,
    paleo_setting:'Damara Belt carbonatite complex — Neoproterozoic alkaline-carbonatite intrusion with HREE enrichment',
    ai_summary:'Notable for HREE-enriched profile, a rarer geological target. Namibia is highly investor-friendly. Remote location with improving infrastructure via green hydrogen corridor.',
    flags:['hree_enriched','stable_jurisdiction'] },

  // Africa · Tantalum

  { id:'tnv', name:'Tantalite Valley', country:'Namibia', region:'Karas Region',
    latitude:-28.50, longitude:17.80, primary_mineral:'Tantalum', secondary_minerals:['Lithium','Niobium'],
    deposit_type:'LCT Pegmatite', status:'exploration', development_stage:'early exploration',
    resource_size_tonnes:8000000, grade_percent:0.018, grade_unit:'% Ta2O5',
    owner:'Namibia Critical Metals', operator:'Namibia Critical Metals',
    opportunity_score:61, difficulty_score:48, underutilization_score:88,
    infrastructure_score:42, country_risk_score:20, environmental_risk_score:32,
    data_confidence:'low', mineral_color:mc('Tantalum'), source_count:3,
    paleo_setting:'Damara Belt Neoproterozoic pegmatite province — collision orogen LCT pegmatites in Namibia-Botswana crustal block',
    ai_summary:'Early-stage Ta-Li pegmatite in a stable, low-risk African jurisdiction. Limited data confidence. Namibia mining framework is investor-friendly.',
    flags:['stable_jurisdiction','early_stage'] },

  // Africa · Graphite

  { id:'bal', name:'Balama Graphite Project', country:'Mozambique', region:'Cabo Delgado',
    latitude:-13.30, longitude:38.60, primary_mineral:'Graphite', secondary_minerals:['Vanadium'],
    deposit_type:'Graphite Flake (Metamorphic)', status:'producing', development_stage:'production',
    resource_size_tonnes:1000000000, grade_percent:16.20, grade_unit:'% TGC',
    owner:'Syrah Resources', operator:'Syrah Resources',
    opportunity_score:74, difficulty_score:55, underutilization_score:45,
    infrastructure_score:48, country_risk_score:52, environmental_risk_score:42,
    data_confidence:'high', mineral_color:mc('Graphite'), source_count:7,
    paleo_setting:'Mozambique Belt high-grade Proterozoic metamorphic terrane — graphite-bearing granulite facies gneiss',
    ai_summary:'One of world\'s largest natural graphite deposits. Syrah supplies to Vidalia Louisiana battery anode plant for US EV supply chain. Insurgency in Cabo Delgado is an ongoing security risk.',
    flags:['world_class','anode_supply_chain','security_risk'] },

  { id:'mol', name:'Molo Graphite Project', country:'Madagascar', region:'Atsimo-Atsinanana',
    latitude:-23.00, longitude:46.50, primary_mineral:'Graphite', secondary_minerals:['Vanadium'],
    deposit_type:'Graphite Flake (Metamorphic)', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:141000000, grade_percent:6.00, grade_unit:'% TGC',
    owner:'NextSource Materials', operator:'NextSource Materials',
    opportunity_score:66, difficulty_score:58, underutilization_score:78,
    infrastructure_score:32, country_risk_score:48, environmental_risk_score:48,
    data_confidence:'medium', mineral_color:mc('Graphite'), source_count:4,
    paleo_setting:'Madagascar Archaean-Proterozoic basement — high-grade metamorphic graphite in granulite terrane',
    ai_summary:'High-purity graphite on geologically prolific but infrastructure-challenged Madagascar. Downstream processing strategy for battery-grade spherical graphite under development.',
    flags:['battery_grade','infrastructure_constrained'] },

  // Africa · Manganese

  { id:'hkmf', name:'Kalahari Manganese Field', country:'South Africa', region:'Northern Cape',
    latitude:-27.50, longitude:22.70, primary_mineral:'Manganese', secondary_minerals:['Iron'],
    deposit_type:'Sedimentary Manganese', status:'producing', development_stage:'production',
    resource_size_tonnes:14000000000, grade_percent:38.00, grade_unit:'% Mn',
    owner:'South32 / Assmang / Samancor', operator:'Multiple operators',
    opportunity_score:85, difficulty_score:30, underutilization_score:20,
    infrastructure_score:82, country_risk_score:30, environmental_risk_score:28,
    data_confidence:'high', mineral_color:mc('Manganese'), source_count:9,
    paleo_setting:'Paleoproterozoic Transvaal Supergroup — marine sedimentary manganese in Kalahari Formation (~2.2 Ga)',
    ai_summary:'World\'s largest manganese resource — ~80% of global land-based Mn reserves. Critical for steel and LMFP battery cathode supply chains. Multiple large operations across the district.',
    flags:['world_class','battery_manganese','critical_supply'] },

  { id:'moa', name:'Moanda Manganese Mine', country:'Gabon', region:'Haut-Ogooue',
    latitude:-1.52, longitude:13.17, primary_mineral:'Manganese', secondary_minerals:['Iron'],
    deposit_type:'Sedimentary Manganese', status:'producing', development_stage:'production',
    resource_size_tonnes:2200000000, grade_percent:47.00, grade_unit:'% Mn',
    owner:'Eramet 63.5% / Comilog', operator:'Comilog (Eramet)',
    opportunity_score:79, difficulty_score:38, underutilization_score:22,
    infrastructure_score:65, country_risk_score:42, environmental_risk_score:35,
    data_confidence:'high', mineral_color:mc('Manganese'), source_count:7,
    paleo_setting:'Proterozoic Francevillian Basin — marine sedimentary Mn in equatorial Africa; one of oldest known large Mn deposits globally',
    ai_summary:'World\'s highest-grade major manganese mine. Eramet flagship asset. Dedicated railway to Owendo port. Critical supplier to global steel and alloy industry.',
    flags:['world_class','highest_grade_mn'] },

  // ═══════════════════════════════════════════════════
  // AUSTRALIA  (6 deposits)
  // ═══════════════════════════════════════════════════

  { id:'gb', name:'Greenbushes Lithium Mine', country:'Australia', region:'Western Australia',
    latitude:-33.85, longitude:116.07, primary_mineral:'Lithium', secondary_minerals:['Tantalum','Tin'],
    deposit_type:'LCT Pegmatite', status:'producing', development_stage:'production',
    resource_size_tonnes:286000000, grade_percent:2.10, grade_unit:'% Li2O',
    owner:'Talison (ALB 49% / SQM 25% / Tianqi 26%)', operator:'Talison Lithium',
    opportunity_score:92, difficulty_score:34, underutilization_score:18,
    infrastructure_score:95, country_risk_score:12, environmental_risk_score:28,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:18,
    paleo_setting:'Paleoproterozoic Balingup Metamorphic Belt, Yilgarn Craton — benchmark LCT spodumene pegmatite (~2.5 Ga)',
    ai_summary:'World\'s largest and highest-grade operating lithium mine — 286 Mt @ 2.1% Li2O. CGP3 chemical-grade plant expansion commissioning 2025. Near fully utilised; benchmark global asset.',
    flags:['world_class','high_priority'] },

  { id:'pil', name:'Pilgangoora (Pilbara Minerals)', country:'Australia', region:'Western Australia',
    latitude:-21.33, longitude:118.68, primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'producing', development_stage:'expansion',
    resource_size_tonnes:308000000, grade_percent:1.13, grade_unit:'% Li2O',
    owner:'Pilbara Minerals (ASX: PLS)', operator:'Pilbara Minerals',
    opportunity_score:82, difficulty_score:35, underutilization_score:38,
    infrastructure_score:80, country_risk_score:12, environmental_risk_score:22,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:8,
    paleo_setting:'Archaean Pilbara Craton — metasediment-hosted LCT pegmatite suite',
    ai_summary:'One of world\'s largest hard rock Li deposits. P1000 expansion to 1 Mtpa spodumene concentrate underway. ~200 km to Port Hedland. Strong ESG credentials.',
    flags:['expansion_potential'] },

  { id:'wod', name:'Wodgina Lithium Project', country:'Australia', region:'Western Australia',
    latitude:-21.07, longitude:118.71, primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'producing', development_stage:'production',
    resource_size_tonnes:1300000000, grade_percent:1.17, grade_unit:'% Li2O',
    owner:'Albemarle 49% / Mineral Resources 51%', operator:'MARBL JV',
    opportunity_score:82, difficulty_score:36, underutilization_score:42,
    infrastructure_score:78, country_risk_score:12, environmental_risk_score:25,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:7,
    paleo_setting:'Archaean Pilbara Craton — giant LCT pegmatite swarm hosted in Archaean metamorphics',
    ai_summary:'One of world\'s largest Li resources. MARBL JV (Albemarle/MinRes). Processing restarted 2023 after care-and-maintenance period. World-scale spodumene producer.',
    flags:['world_class'] },

  { id:'mmt', name:'Mount Marion Lithium Project', country:'Australia', region:'Western Australia',
    latitude:-30.50, longitude:121.50, primary_mineral:'Lithium', secondary_minerals:['Tantalum'],
    deposit_type:'LCT Pegmatite', status:'producing', development_stage:'production',
    resource_size_tonnes:76900000, grade_percent:1.37, grade_unit:'% Li2O',
    owner:'Ganfeng 50% / Mineral Resources 50%', operator:'Mineral Resources',
    opportunity_score:76, difficulty_score:38, underutilization_score:30,
    infrastructure_score:74, country_risk_score:12, environmental_risk_score:22,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:6,
    paleo_setting:'Archaean Yilgarn Craton — LCT pegmatite hosted in Proterozoic Capricorn Orogen margin',
    ai_summary:'Significant hard rock Li producer in WA. Ganfeng 50% offtake partner. Consistent producer since 2017. Close to Kalgoorlie with good infrastructure.',
    flags:['chinese_jv','producing'] },

  { id:'od', name:'Olympic Dam', country:'Australia', region:'South Australia',
    latitude:-30.44, longitude:136.89, primary_mineral:'Copper', secondary_minerals:['Uranium','Gold','Silver','Rare Earths'],
    deposit_type:'IOCG', status:'producing', development_stage:'expansion',
    resource_size_tonnes:10100000000, grade_percent:0.72, grade_unit:'%',
    owner:'BHP', operator:'BHP',
    opportunity_score:86, difficulty_score:48, underutilization_score:55,
    infrastructure_score:70, country_risk_score:12, environmental_risk_score:35,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:11,
    paleo_setting:'Mesoproterozoic Gawler Craton — IOCG system (~1.59 Ga) related to Hiltaba Suite granites and Olympic Dam Formation brecciation',
    ai_summary:'World\'s largest known uranium deposit and 4th largest copper resource. BHP expansion targets 650 ktpa Cu by early 2030s. 60 km purpose-built rail spur to Port Augusta.',
    flags:['world_class','expansion_potential','iocg_system'] },

  { id:'mweld', name:'Mount Weld Rare Earths', country:'Australia', region:'Western Australia',
    latitude:-27.37, longitude:122.17, primary_mineral:'Rare Earths', secondary_minerals:['Phosphate','Niobium'],
    deposit_type:'Carbonatite (Laterite REE)', status:'producing', development_stage:'production',
    resource_size_tonnes:56000000, grade_percent:8.10, grade_unit:'% TREO',
    owner:'Lynas Rare Earths', operator:'Lynas Rare Earths',
    opportunity_score:83, difficulty_score:35, underutilization_score:22,
    infrastructure_score:68, country_risk_score:12, environmental_risk_score:40,
    data_confidence:'high', mineral_color:mc('Rare Earths'), source_count:10,
    paleo_setting:'Archaean Yilgarn Craton — deeply weathered carbonatite complex producing supergene REE enrichment',
    ai_summary:'Highest-grade REE deposit at surface globally. Lynas is only significant non-Chinese HREE producer outside China. Processing at Kuantan Malaysia and Kalgoorlie WA.',
    flags:['world_class','non_china_ree','strategic'] },

  // ═══════════════════════════════════════════════════
  // AMERICAS  (10 deposits)
  // ═══════════════════════════════════════════════════

  { id:'at', name:'Salar de Atacama', country:'Chile', region:'Antofagasta Region',
    latitude:-23.48, longitude:-68.27, primary_mineral:'Lithium', secondary_minerals:['Potassium','Boron'],
    deposit_type:'Brine (Salar)', status:'producing', development_stage:'production',
    resource_size_tonnes:9800000000, grade_percent:0.157, grade_unit:'% Li (brine)',
    owner:'SQM / Albemarle', operator:'SQM / Albemarle',
    opportunity_score:91, difficulty_score:38, underutilization_score:14,
    infrastructure_score:72, country_risk_score:28, environmental_risk_score:68,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:14,
    paleo_setting:'Neogene closed-basin brine system — Andean volcanic arc-fed halite-dominated salar at 2300 m elevation',
    ai_summary:'World\'s largest lithium brine and highest brine grade globally. Water usage in hyperarid environment and indigenous Atacameno water rights are dominant risk factors.',
    flags:['world_class','water_risk'] },

  { id:'hom', name:'Salar del Hombre Muerto', country:'Argentina', region:'Catamarca Province',
    latitude:-26.40, longitude:-67.10, primary_mineral:'Lithium', secondary_minerals:['Potassium'],
    deposit_type:'Brine (Salar)', status:'producing', development_stage:'production',
    resource_size_tonnes:1400000, grade_percent:0.059, grade_unit:'% Li (brine)',
    owner:'POSCO', operator:'POSCO Argentina',
    opportunity_score:72, difficulty_score:48, underutilization_score:55,
    infrastructure_score:52, country_risk_score:55, environmental_risk_score:50,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:5,
    paleo_setting:'Puna Plateau Neogene closed-basin salar — Lithium Triangle brine system, Argentina',
    ai_summary:'POSCO (South Korea) operates. Phase 1 first production 2023. Lithium Triangle location with good brine chemistry. Argentina macro risk is moderate.',
    flags:['lithium_triangle','korean_ownership'] },

  { id:'th', name:'Thacker Pass', country:'United States', region:'Nevada',
    latitude:41.85, longitude:-118.06, primary_mineral:'Lithium', secondary_minerals:['Sulphur'],
    deposit_type:'Sedimentary Claystone', status:'construction', development_stage:'construction',
    resource_size_tonnes:13700000, grade_percent:0.35, grade_unit:'% Li',
    owner:'Lithium Americas / General Motors', operator:'Lithium Americas Corp',
    opportunity_score:76, difficulty_score:55, underutilization_score:72,
    infrastructure_score:65, country_risk_score:8, environmental_risk_score:58,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:7,
    paleo_setting:'Miocene McDermitt Caldera lacustrine basin — volcanic ash-derived lithium smectite clay, Oregon-Nevada border',
    ai_summary:'Largest known lithium resource in the USA. GM $650 M strategic investment. Novel acid-leach clay process not yet proven at commercial scale. Indigenous Paiute-Shoshone ancestral site — active legal contestation.',
    flags:['construction_stage','indigenous_rights','strategic_usa'] },

  { id:'rhy', name:'Rhyolite Ridge Lithium-Boron', country:'United States', region:'Nevada',
    latitude:37.76, longitude:-118.07, primary_mineral:'Lithium', secondary_minerals:['Boron'],
    deposit_type:'Sedimentary (Volcanic Lake)', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:3900000, grade_percent:0.31, grade_unit:'% Li',
    owner:'ioneer Ltd', operator:'ioneer Ltd',
    opportunity_score:70, difficulty_score:52, underutilization_score:75,
    infrastructure_score:60, country_risk_score:8, environmental_risk_score:62,
    data_confidence:'medium', mineral_color:mc('Lithium'), source_count:5,
    paleo_setting:'Miocene volcanic lake sediments — Searles Lake basin-type mineralisation in Basin and Range extensional province',
    ai_summary:'Dual-commodity Li-B project in Nevada. Sibanye-Stillwater strategic investment. Tiehm\'s buckwheat endangered species habitat on site — ongoing environmental review.',
    flags:['usa_domestic','dual_commodity','environmental_risk'] },

  { id:'jad', name:'Jadar Lithium-Boron Project', country:'Serbia', region:'Jadar Valley',
    latitude:44.17, longitude:19.52, primary_mineral:'Lithium', secondary_minerals:['Boron'],
    deposit_type:'Sedimentary (Jadarite)', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:55000000, grade_percent:1.80, grade_unit:'% Li2O equiv.',
    owner:'Rio Tinto', operator:'Rio Tinto Serbia',
    opportunity_score:79, difficulty_score:62, underutilization_score:80,
    infrastructure_score:72, country_risk_score:38, environmental_risk_score:65,
    data_confidence:'high', mineral_color:mc('Lithium'), source_count:8,
    paleo_setting:'Miocene continental rift basin — unique jadarite mineral found only at this locality; no known geological analogue',
    ai_summary:'Potentially Europe\'s largest lithium deposit. Unique jadarite mineral requires bespoke processing. License revoked 2022, partially reinstated 2024. High strategic value for European battery supply chain.',
    flags:['unique_mineral','europe_supply_chain','permitting_contested'] },

  { id:'esc', name:'Escondida', country:'Chile', region:'Antofagasta Region',
    latitude:-24.27, longitude:-69.07, primary_mineral:'Copper', secondary_minerals:['Gold','Silver','Molybdenum'],
    deposit_type:'Porphyry Copper', status:'producing', development_stage:'production',
    resource_size_tonnes:32400000000, grade_percent:0.44, grade_unit:'%',
    owner:'BHP 57.5% / Rio Tinto 30%', operator:'BHP Billiton Minerals',
    opportunity_score:89, difficulty_score:30, underutilization_score:12,
    infrastructure_score:80, country_risk_score:28, environmental_risk_score:42,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:12,
    paleo_setting:'Paleocene-Eocene Domeyko Cordillera porphyry belt — supergene enrichment over primary sulphide resource',
    ai_summary:'World\'s largest copper mine, ~5% of global supply. Sulphide and oxide ore via concentrator and SX-EW. Desalination plant at Coloso eliminates freshwater dependency.',
    flags:['world_class','high_priority'] },

  { id:'col', name:'Collahuasi Copper Mine', country:'Chile', region:'Tarapaca Region',
    latitude:-20.98, longitude:-68.71, primary_mineral:'Copper', secondary_minerals:['Molybdenum','Silver'],
    deposit_type:'Porphyry Copper', status:'producing', development_stage:'production',
    resource_size_tonnes:16600000000, grade_percent:0.90, grade_unit:'%',
    owner:'Anglo American 44% / Glencore 44% / Mitsui 12%', operator:'Compania Minera Dona Ines de Collahuasi',
    opportunity_score:85, difficulty_score:38, underutilization_score:20,
    infrastructure_score:72, country_risk_score:28, environmental_risk_score:45,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:9,
    paleo_setting:'Eocene Atacama porphyry belt — high-altitude Andean Cu-Mo porphyry at 4400 m',
    ai_summary:'World\'s third largest copper mine, ~500 ktpa Cu. Significant sulphide resource with long mine life. High altitude adds operational complexity.',
    flags:['world_class','high_altitude'] },

  { id:'cj', name:'Carajas Province', country:'Brazil', region:'Para State',
    latitude:-6.07, longitude:-50.18, primary_mineral:'Copper', secondary_minerals:['Nickel','Iron','Gold'],
    deposit_type:'IOCG / BIF', status:'producing', development_stage:'production',
    resource_size_tonnes:7200000000, grade_percent:0.92, grade_unit:'%',
    owner:'Vale S.A.', operator:'Vale S.A.',
    opportunity_score:84, difficulty_score:42, underutilization_score:28,
    infrastructure_score:72, country_risk_score:35, environmental_risk_score:48,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:10,
    paleo_setting:'Archaean Carajas Domain, Amazon Craton — Neoarchean IOCG and BIF-hosted iron system in Itacaiunas Supergroup',
    ai_summary:'One of world\'s most significant mineral provinces — highest-grade iron ore globally, major copper (Sossego/Salobo), and nickel. Vale core asset. Amazon Basin logistics complexity.',
    flags:['world_class','multi_mineral'] },

  { id:'onca', name:'Onca Puma Nickel Mine', country:'Brazil', region:'Para State',
    latitude:-7.05, longitude:-51.70, primary_mineral:'Nickel', secondary_minerals:['Cobalt'],
    deposit_type:'Laterite (Saprolite)', status:'producing', development_stage:'production',
    resource_size_tonnes:268000000, grade_percent:1.72, grade_unit:'% Ni',
    owner:'Vale S.A.', operator:'Vale S.A.',
    opportunity_score:74, difficulty_score:45, underutilization_score:38,
    infrastructure_score:62, country_risk_score:35, environmental_risk_score:50,
    data_confidence:'high', mineral_color:mc('Nickel'), source_count:6,
    paleo_setting:'Archaean Carajas Domain — lateritic weathering over komatiitic ultramafic sequence, Amazon Craton',
    ai_summary:'Largest nickel laterite deposit in Brazil. Vale operated. Court-ordered suspension 2020-2021 resolved. Carajas region cluster asset.',
    flags:['brazil','laterite'] },

  { id:'grck', name:'Graphite Creek', country:'United States', region:'Alaska',
    latitude:65.16, longitude:-163.26, primary_mineral:'Graphite', secondary_minerals:['Vanadium'],
    deposit_type:'Graphite Flake (Metamorphic)', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:2490000000, grade_percent:7.80, grade_unit:'% TGC',
    owner:'Graphite One Inc.', operator:'Graphite One Inc.',
    opportunity_score:68, difficulty_score:62, underutilization_score:85,
    infrastructure_score:28, country_risk_score:8, environmental_risk_score:50,
    data_confidence:'medium', mineral_color:mc('Graphite'), source_count:4,
    paleo_setting:'Proterozoic western Alaska terrane — Seward Peninsula metamorphic graphite belt',
    ai_summary:'One of North America\'s largest graphite deposits. Remote Alaskan location with no road access. US DOD support as critical mineral supply chain asset. Proposed integrated mine-to-anode facility.',
    flags:['usa_domestic','dod_support','remote','strategic'] },

  // ═══════════════════════════════════════════════════
  // ASIA-PACIFIC  (5 deposits)
  // ═══════════════════════════════════════════════════

  { id:'gras', name:'Grasberg Copper-Gold Mine', country:'Indonesia', region:'Papua Province',
    latitude:-4.05, longitude:137.12, primary_mineral:'Copper', secondary_minerals:['Gold','Silver'],
    deposit_type:'Porphyry Copper-Gold', status:'producing', development_stage:'production',
    resource_size_tonnes:38800000000, grade_percent:0.44, grade_unit:'%',
    owner:'Freeport-McMoRan 48.76% / PT-FI / MIND ID', operator:'Freeport-McMoRan',
    opportunity_score:86, difficulty_score:52, underutilization_score:18,
    infrastructure_score:65, country_risk_score:58, environmental_risk_score:65,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:11,
    paleo_setting:'Pliocene New Guinea Fold Belt — giant Cu-Au porphyry at 4300 m elevation in Sudirman Range',
    ai_summary:'Largest gold mine and one of largest copper mines globally. Deep Ore Zone underground block cave. Indonesian government stake increased to 51%. High-altitude remote operation.',
    flags:['world_class','high_altitude'] },

  { id:'oyu', name:'Oyu Tolgoi (Hugo Dummett)', country:'Mongolia', region:'South Gobi Province',
    latitude:43.00, longitude:107.11, primary_mineral:'Copper', secondary_minerals:['Gold','Silver'],
    deposit_type:'Porphyry Copper-Gold', status:'producing', development_stage:'expansion',
    resource_size_tonnes:20800000000, grade_percent:0.62, grade_unit:'%',
    owner:'Rio Tinto 66% / Mongolian Govt 34%', operator:'Rio Tinto / Turquoise Hill',
    opportunity_score:84, difficulty_score:58, underutilization_score:40,
    infrastructure_score:55, country_risk_score:50, environmental_risk_score:35,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:11,
    paleo_setting:'Palaeozoic Central Asian Orogenic Belt — Carboniferous porphyry Cu-Au system in Gurvansaikhan Terrane',
    ai_summary:'One of world\'s largest Cu-Au deposits. Hugo Dummett underground block cave expansion transformative. Rio Tinto and Mongolian government relations complex but stable.',
    flags:['world_class','underground_expansion'] },

  { id:'by', name:'Bayan Obo REE-Iron Mine', country:'China', region:'Inner Mongolia',
    latitude:41.80, longitude:109.97, primary_mineral:'Rare Earths', secondary_minerals:['Iron','Niobium','Fluorite'],
    deposit_type:'Carbonatite', status:'producing', development_stage:'production',
    resource_size_tonnes:1500000000, grade_percent:6.20, grade_unit:'% REO',
    owner:'Baogang Group (state-owned)', operator:'Baotou Steel (Baogang)',
    opportunity_score:87, difficulty_score:55, underutilization_score:30,
    infrastructure_score:85, country_risk_score:45, environmental_risk_score:60,
    data_confidence:'medium', mineral_color:mc('Rare Earths'), source_count:7,
    paleo_setting:'Proterozoic North China Craton margin — Devonian carbonatite-related REE mineralisation overprinting Precambrian supracrustals',
    ai_summary:'World\'s largest REE deposit, ~60% of global rare earth output. State-controlled. Thorium radioactive tailings management is a long-term liability.',
    flags:['world_class','geopolitical_risk','supply_chain_concentration'] },

  { id:'ak', name:'Aktogay Mine', country:'Kazakhstan', region:'East Kazakhstan',
    latitude:46.85, longitude:79.32, primary_mineral:'Copper', secondary_minerals:['Molybdenum'],
    deposit_type:'Porphyry Copper', status:'producing', development_stage:'production',
    resource_size_tonnes:5800000000, grade_percent:0.33, grade_unit:'%',
    owner:'KAZ Minerals (Cuprum Holding)', operator:'KAZ Minerals',
    opportunity_score:74, difficulty_score:58, underutilization_score:35,
    infrastructure_score:60, country_risk_score:55, environmental_risk_score:32,
    data_confidence:'high', mineral_color:mc('Copper'), source_count:7,
    paleo_setting:'Paleozoic Central Asian Orogenic Belt — Devonian porphyry copper province',
    ai_summary:'Major Central Asia Cu porphyry. Phase 2 doubles capacity to ~200 ktpa Cu. KAZ Minerals taken private by Cuprum Holding 2021.',
    flags:['expansion_completed','central_asia'] },

  { id:'loh', name:'Weda Bay Nickel Complex', country:'Indonesia', region:'North Maluku',
    latitude:0.40, longitude:128.00, primary_mineral:'Nickel', secondary_minerals:['Cobalt','Manganese'],
    deposit_type:'Laterite (Limonite/Saprolite)', status:'producing', development_stage:'production',
    resource_size_tonnes:400000000, grade_percent:1.05, grade_unit:'% Ni',
    owner:'Tsingshan / IMIP JV', operator:'IMIP Industrial Park',
    opportunity_score:77, difficulty_score:45, underutilization_score:35,
    infrastructure_score:60, country_risk_score:42, environmental_risk_score:62,
    data_confidence:'medium', mineral_color:mc('Nickel'), source_count:5,
    paleo_setting:'Halmahera ophiolite belt — lateritic weathering profile over ultramafic basement, North Maluku arc terrane',
    ai_summary:'Indonesia holds world\'s largest Ni reserves. Weda Bay HPAL complex produces battery-grade NiSO4. Chinese investment dominant. Environmental impact of HPAL facilities under scrutiny.',
    flags:['battery_supply_chain','chinese_investment','ev_supply_chain'] },

  // ═══════════════════════════════════════════════════
  // EUROPE & RUSSIA  (3 deposits)
  // ═══════════════════════════════════════════════════

  { id:'nor', name:'Norilsk Nickel (Oktyabrskoye)', country:'Russia', region:'Krasnoyarsk Krai',
    latitude:69.35, longitude:88.20, primary_mineral:'Nickel', secondary_minerals:['Copper','Palladium','Platinum','Cobalt'],
    deposit_type:'Magmatic Sulphide (Flood Basalt)', status:'producing', development_stage:'production',
    resource_size_tonnes:2100000000, grade_percent:1.77, grade_unit:'% Ni',
    owner:'Nornickel', operator:'Nornickel',
    opportunity_score:72, difficulty_score:70, underutilization_score:20,
    infrastructure_score:65, country_risk_score:85, environmental_risk_score:70,
    data_confidence:'medium', mineral_color:mc('Nickel'), source_count:6,
    paleo_setting:'Siberian Traps Large Igneous Province (~252 Ma) — world\'s largest flood basalt event hosting Ni-Cu-PGE in Norilsk-Talnakh intrusions',
    ai_summary:'World\'s largest Ni and Pd producer. Post-2022 sanctions restrict Western offtake. Critical PGM supplier for catalytic converters and hydrogen fuel cells. Environmental record is poor.',
    flags:['world_class','sanctions_risk','pgm_critical'] },

  { id:'kev', name:'Kevitsa Mine', country:'Finland', region:'Lapland',
    latitude:67.74, longitude:26.69, primary_mineral:'Nickel', secondary_minerals:['Copper','Cobalt','PGMs'],
    deposit_type:'Magmatic Sulphide', status:'producing', development_stage:'production',
    resource_size_tonnes:500000000, grade_percent:0.25, grade_unit:'% Ni',
    owner:'Boliden AB', operator:'Boliden AB',
    opportunity_score:72, difficulty_score:38, underutilization_score:30,
    infrastructure_score:75, country_risk_score:5, environmental_risk_score:42,
    data_confidence:'high', mineral_color:mc('Nickel'), source_count:7,
    paleo_setting:'Paleoproterozoic Central Lapland Greenstone Belt — mafic-ultramafic hosted Ni-Cu-PGE sulphide',
    ai_summary:'Important European Ni-Co source. AAA jurisdiction (Finland, EU member). Arctic logistics well-serviced. Boliden flagship nickel operation.',
    flags:['european_supply_chain','eu_strategic'] },

  { id:'kvan', name:'Kvanefjeld (Kuannersuit)', country:'Greenland', region:'South Greenland',
    latitude:61.01, longitude:-45.00, primary_mineral:'Rare Earths', secondary_minerals:['Uranium','Zinc'],
    deposit_type:'Peralkaline Igneous (Ilimaussaq)', status:'exploration', development_stage:'feasibility',
    resource_size_tonnes:956000000, grade_percent:1.08, grade_unit:'% TREO',
    owner:'Energy Transition Minerals', operator:'Energy Transition Minerals',
    opportunity_score:67, difficulty_score:72, underutilization_score:88,
    infrastructure_score:38, country_risk_score:40, environmental_risk_score:68,
    data_confidence:'medium', mineral_color:mc('Rare Earths'), source_count:5,
    paleo_setting:'Proterozoic Ilimaussaq Complex — world\'s largest peralkaline intrusion with giant REE-U-Zn resource in Gardar rift province',
    ai_summary:'One of world\'s largest REE deposits. Greenland parliament banned uranium mining 2021 — project economics depend on uranium byproduct. High strategic value if permitting can be resolved.',
    flags:['uranium_ban','strategic','arctic'] },

  // ═══════════════════════════════════════════════════
  // CANADA  (6 deposits)
  // ═══════════════════════════════════════════════════

  { id:'voi', name:"Voisey's Bay Nickel-Cobalt Mine", country:'Canada', region:'Labrador',
    latitude:56.37, longitude:-61.75, primary_mineral:'Nickel', secondary_minerals:['Cobalt','Copper'],
    deposit_type:'Magmatic Sulphide', status:'producing', development_stage:'expansion',
    resource_size_tonnes:137000000, grade_percent:2.83, grade_unit:'% Ni',
    owner:"Vale S.A.", operator:'Vale Canada',
    opportunity_score:80, difficulty_score:48, underutilization_score:35,
    infrastructure_score:62, country_risk_score:10, environmental_risk_score:50,
    data_confidence:'high', mineral_color:mc('Nickel'), source_count:9,
    paleo_setting:'Proterozoic Nain Igneous Province — mafic-ultramafic intrusion-hosted Ni-Cu-Co sulphide in Labrador tectonic terrane',
    ai_summary:'High-grade Ni-Co sulphide in remote Arctic Labrador. Vale Long Harbour hydromet refinery processes concentrate directly to finished metal. Underground expansion ongoing.',
    flags:['high_grade','cobalt_byproduct','arctic_logistics'] },

  { id:'su', name:'Sudbury Basin', country:'Canada', region:'Ontario',
    latitude:46.50, longitude:-81.00, primary_mineral:'Nickel', secondary_minerals:['Copper','Cobalt','PGMs'],
    deposit_type:'Magmatic Sulphide (Impact Melt)', status:'producing', development_stage:'production',
    resource_size_tonnes:1800000000, grade_percent:1.30, grade_unit:'% Ni',
    owner:'Glencore / Vale / KGHM', operator:'Multiple operators',
    opportunity_score:80, difficulty_score:40, underutilization_score:20,
    infrastructure_score:88, country_risk_score:10, environmental_risk_score:35,
    data_confidence:'high', mineral_color:mc('Nickel'), source_count:15,
    paleo_setting:'1.85 Ga Sudbury Igneous Complex — meteorite impact melt sheet producing giant magmatic Ni-Cu-PGE sulphide camp in Superior Province',
    ai_summary:'World\'s largest Ni-Cu-PGE district, 140+ years of continuous production. Multiple operators. Excellent infrastructure and jurisdiction. Nickel Rim South (Glencore) is the primary active mine.',
    flags:['world_class','mature_district'] },

  { id:'cigar', name:'Cigar Lake Mine', country:'Canada', region:'Saskatchewan',
    latitude:58.07, longitude:-104.10, primary_mineral:'Uranium', secondary_minerals:['Nickel','Cobalt'],
    deposit_type:'Unconformity Uranium', status:'producing', development_stage:'production',
    resource_size_tonnes:100000, grade_percent:14.90, grade_unit:'% U3O8',
    owner:'Cameco 54.5% / Orano 40.2%', operator:'Cameco Corporation',
    opportunity_score:83, difficulty_score:45, underutilization_score:22,
    infrastructure_score:72, country_risk_score:8, environmental_risk_score:38,
    data_confidence:'high', mineral_color:mc('Uranium'), source_count:8,
    paleo_setting:'Athabasca Basin Proterozoic unconformity — world\'s highest-grade uranium deposits at sandstone-basement contact',
    ai_summary:'World\'s highest-grade uranium mine at ~14.9% U3O8. Cameco and Orano JV. Flooded orebody requires innovative jet boring mining technique. Critical for nuclear power supply chain.',
    flags:['world_class','highest_grade_u','nuclear_supply'] },

  { id:'mcar', name:'McArthur River Mine', country:'Canada', region:'Saskatchewan',
    latitude:57.77, longitude:-105.07, primary_mineral:'Uranium', secondary_minerals:['Nickel','Cobalt'],
    deposit_type:'Unconformity Uranium', status:'producing', development_stage:'production',
    resource_size_tonnes:170000, grade_percent:6.86, grade_unit:'% U3O8',
    owner:'Cameco 69.8% / Orano 30.2%', operator:'Cameco Corporation',
    opportunity_score:82, difficulty_score:42, underutilization_score:18,
    infrastructure_score:70, country_risk_score:8, environmental_risk_score:35,
    data_confidence:'high', mineral_color:mc('Uranium'), source_count:8,
    paleo_setting:'Athabasca Basin unconformity-related uranium — high-grade basement-hosted pod at sandstone contact',
    ai_summary:'World\'s largest uranium deposit by resource. Cameco flagship. Care-and-maintenance 2018-2022, production restarted. Ore processed at Key Lake mill.',
    flags:['world_class','cameco_flagship'] },

  { id:'mpas', name:'Mountain Pass Rare Earth Mine', country:'United States', region:'California',
    latitude:35.48, longitude:-115.52, primary_mineral:'Rare Earths', secondary_minerals:['Niobium','Barite'],
    deposit_type:'Carbonatite', status:'producing', development_stage:'production',
    resource_size_tonnes:4700000000, grade_percent:7.98, grade_unit:'% TREO',
    owner:'MP Materials', operator:'MP Materials',
    opportunity_score:81, difficulty_score:38, underutilization_score:28,
    infrastructure_score:80, country_risk_score:8, environmental_risk_score:42,
    data_confidence:'high', mineral_color:mc('Rare Earths'), source_count:9,
    paleo_setting:'Proterozoic carbonatite complex in Mojave Desert — Sulphide Queen REE deposit in alkaline intrusion',
    ai_summary:'Only operating REE mine in the US. MP Materials restarted 2017. Downstream NdPr processing plant in Fort Worth TX for magnet alloy. Critical to US rare earth independence strategy.',
    flags:['usa_domestic','non_china_ree','strategic','magnet_supply'] },

  { id:'mat', name:'Matawinie Graphite Project', country:'Canada', region:'Quebec',
    latitude:46.60, longitude:-74.00, primary_mineral:'Graphite', secondary_minerals:['Vanadium'],
    deposit_type:'Graphite Flake (Metamorphic)', status:'construction', development_stage:'construction',
    resource_size_tonnes:116800000, grade_percent:4.30, grade_unit:'% TGC',
    owner:'Nouveau Monde Graphite', operator:'Nouveau Monde Graphite',
    opportunity_score:72, difficulty_score:44, underutilization_score:62,
    infrastructure_score:65, country_risk_score:8, environmental_risk_score:40,
    data_confidence:'high', mineral_color:mc('Graphite'), source_count:6,
    paleo_setting:'Grenville Province Proterozoic high-grade metamorphic terrane — graphite-bearing paragneiss in Laurentian Highlands',
    ai_summary:'Fully electric open-pit graphite mine design (NMG flagship). North American graphite supply for EV batteries. Quebec green energy and downstream processing planned at Saint-Michel-des-Saints.',
    flags:['battery_supply_chain','electric_mine','north_america'] },

];

// ── Africa country set ─────────────────────────────────────────
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
  const total       = deposits.length;
  const producing   = deposits.filter(d => d.status === 'producing').length;
  const undeveloped = deposits.filter(d =>
    ['undeveloped','exploration','feasibility','construction'].includes(d.status)
  ).length;
  const countries   = new Set(deposits.map(d => d.country)).size;
  const minerals    = new Set(deposits.map(d => d.primary_mineral)).size;
  const highOpp     = deposits.filter(d => d.opportunity_score >= 75).length;
  const highConf    = deposits.filter(d => d.data_confidence === 'high').length;
  const avgOpp      = total > 0
    ? Math.round(deposits.reduce((s, d) => s + d.opportunity_score, 0) / total)
    : 0;
  const african     = deposits.filter(d => isAfrica(d)).length;
  return {
    total_deposits:total, producing, undeveloped, countries_covered:countries,
    minerals_covered:minerals, high_opportunity:highOpp, high_confidence:highConf,
    avg_opportunity:avgOpp, african_deposits:african,
  };
}
