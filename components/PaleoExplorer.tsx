'use client';
import { useState, useMemo, useCallback } from 'react';

// ── Geologic time periods ──────────────────────────────────────
interface GeoPeriod {
  ma: number;
  label: string;
  epoch: string;
  ageRange: string;
  temperature: string;
  seaLevel: string;
  continentConfig: string; // name of SVG config to render
  insights: string[];
  driftNote: string;
  prospectivityScore: number;
  prospectivityLevel: 'High' | 'Moderate' | 'Low';
  prospectivityHigh: number;
  prospectivityMod: number;
  prospectivityLow: number;
}

const PERIODS: GeoPeriod[] = [
  {
    ma: 0, label: 'Present Day', epoch: 'Holocene', ageRange: '0 Ma',
    temperature: 'Modern', seaLevel: 'Modern',
    continentConfig: 'present',
    insights: ['Active porphyry copper belts in Andes and Pacific Rim','Lithium brine systems in Andean Puna plateau','Carbonatite REE provinces in Africa and Scandinavia'],
    driftNote: 'Modern plate configuration. Africa, Australia, and India at current positions.',
    prospectivityScore: 72, prospectivityLevel: 'High', prospectivityHigh: 28, prospectivityMod: 44, prospectivityLow: 28,
  },
  {
    ma: 50, label: 'Eocene', epoch: 'Early Eocene', ageRange: '56 – 34 Ma',
    temperature: 'Warm ↑', seaLevel: 'High ↑',
    continentConfig: 'eocene',
    insights: ['India-Asia collision forming Himalayan REE belts','Atlantic spreading creating new porphyry copper systems','Early laterite nickel formation in tropical belts'],
    driftNote: 'India colliding with Eurasia. South America separated from Africa. Antarctica beginning glaciation.',
    prospectivityScore: 74, prospectivityLevel: 'High', prospectivityHigh: 30, prospectivityMod: 42, prospectivityLow: 28,
  },
  {
    ma: 100, label: 'Late Cretaceous', epoch: 'Late Cretaceous', ageRange: '100 – 66 Ma',
    temperature: 'Warm ↑↑', seaLevel: 'Very High ↑↑',
    continentConfig: 'cretaceous',
    insights: ['Gondwana breakup creating East African Rift pegmatite belts','Caribbean Large Igneous Province — nickel laterites','Laramide porphyry copper arc forming in western North America'],
    driftNote: 'Africa moving north. India separating from Madagascar. South America and Africa fully separated.',
    prospectivityScore: 76, prospectivityLevel: 'High', prospectivityHigh: 32, prospectivityMod: 41, prospectivityLow: 27,
  },
  {
    ma: 120, label: 'Early Cretaceous', epoch: 'Early Cretaceous', ageRange: '145 – 100 Ma',
    temperature: 'Warmer ↑', seaLevel: 'High ↑',
    continentConfig: 'earlyK',
    insights: ['Pegmatite-hosted Li, Ta, Nb deposits in Gondwana collision zones','Carbonatite-related REE deposits in African rift margins','Sedimentary-hosted base metals in rift basin sequences'],
    driftNote: 'Africa moved ~1,650 km north since 120 Ma. Gondwana actively rifting.',
    prospectivityScore: 78, prospectivityLevel: 'High', prospectivityHigh: 23, prospectivityMod: 41, prospectivityLow: 36,
  },
  {
    ma: 250, label: 'Triassic', epoch: 'Early Triassic', ageRange: '252 – 247 Ma',
    temperature: 'Hot ↑↑↑', seaLevel: 'Moderate',
    continentConfig: 'pangaea',
    insights: ['Siberian Traps flood basalt — Ni-Cu-PGE sulphides forming','Tethys passive margin sedimentary copper belts','Early carbonatite intrusions along Pangaea suture zones'],
    driftNote: 'Pangaea fully assembled. Tethys Ocean closing. Siberian LIP eruption event.',
    prospectivityScore: 65, prospectivityLevel: 'Moderate', prospectivityHigh: 18, prospectivityMod: 47, prospectivityLow: 35,
  },
  {
    ma: 500, label: 'Cambrian', epoch: 'Middle Cambrian', ageRange: '509 – 497 Ma',
    temperature: 'Warm ↑', seaLevel: 'High ↑',
    continentConfig: 'cambrian',
    insights: ['Gondwana assembling — major LCT pegmatite provinces forming','Proterozoic sedimentary basins hosting Cu-Co stratiform mineralisation','Precambrian cratons concentrating REE in carbonatite intrusions'],
    driftNote: 'Gondwana assembly underway. Iapetus Ocean opening. Siberia, Laurentia and Baltica separated.',
    prospectivityScore: 58, prospectivityLevel: 'Moderate', prospectivityHigh: 14, prospectivityMod: 44, prospectivityLow: 42,
  },
  {
    ma: 750, label: 'Cryogenian', epoch: 'Cryogenian (Snowball Earth)', ageRange: '720 – 635 Ma',
    temperature: 'Cold ↓↓↓', seaLevel: 'Low ↓↓',
    continentConfig: 'rodinia',
    insights: ['Rodinia supercontinent breakup generating major pegmatite belts','East African Orogen forming Li-Ta-Nb pegmatite provinces','Katangan Basin — earliest Cu-Co stratabound mineralisation'],
    driftNote: 'Rodinia breaking apart. Snowball Earth glaciation. Proto-Africa near South Pole.',
    prospectivityScore: 52, prospectivityLevel: 'Moderate', prospectivityHigh: 12, prospectivityMod: 40, prospectivityLow: 48,
  },
];

// ── Top prospective regions per period ────────────────────────
const REGIONS: Record<string, { name: string; score: number }[]> = {
  present:    [{ name:'Atacama Lithium Province', score:91 },{ name:'Central African Copperbelt', score:88 },{ name:'Mount Weld REE Complex', score:83 },{ name:'Pilbara Pegmatite Belt', score:79 },{ name:'Adola-Kenticha Belt', score:74 }],
  eocene:     [{ name:'Proto-Himalayan REE Belt', score:88 },{ name:'East African Carbonatite Arc', score:84 },{ name:'Laramide Porphyry Belt', score:81 },{ name:'Tethyan Ophiolite Belt', score:76 },{ name:'West African Craton Margin', score:71 }],
  cretaceous: [{ name:'Gondwana Rift Pegmatite Belt', score:90 },{ name:'Caribbean Laterite Province', score:85 },{ name:'Congo Craton Margin', score:82 },{ name:'East African Orogen', score:79 },{ name:'Mozambique Belt', score:74 }],
  earlyK:     [{ name:'Katanga Craton (DRC)', score:89 },{ name:'West African Craton', score:82 },{ name:'East African Orogen', score:78 },{ name:'Congo Craton Margin', score:75 },{ name:'Mozambique Belt', score:72 }],
  pangaea:    [{ name:'Siberian LIP Ni-Cu Province', score:84 },{ name:'Tethys Passive Margin', score:78 },{ name:'Variscan REE Belt', score:73 },{ name:'Gondwana Suture Zone', score:69 },{ name:'Uralian Ophiolite Belt', score:65 }],
  cambrian:   [{ name:'Gondwana Assembly Zone', score:80 },{ name:'Katangan Sedimentary Basin', score:76 },{ name:'Pan-African Pegmatite Arc', score:72 },{ name:'Iapetus Margin', score:66 },{ name:'South China Craton', score:62 }],
  rodinia:    [{ name:'East African Orogen (proto)', score:77 },{ name:'Katangan Proto-Basin', score:73 },{ name:'Kibaran Belt', score:70 },{ name:'Damara Orogen', score:65 },{ name:'Mozambique Belt (proto)', score:61 }],
};

// ── Ancient Earth SVG maps ─────────────────────────────────────
// Each config returns an SVG element with simplified but geologically credible
// ancient continent outlines, tectonic annotations, and deposit markers.

type DepositMarker = { cx: number; cy: number; type: 'known' | 'high' | 'mod' | 'low'; label: string };

interface MapConfig {
  viewBox: string;
  oceanColor: string;
  landColor: string;
  landStroke: string;
  continents: { id: string; d: string; label?: { x: number; y: number; text: string } }[];
  subductionZones: { d: string }[];
  ridges: { d: string }[];
  transforms: { d: string }[];
  deposits: DepositMarker[];
  oceanLabels: { x: number; y: number; text: string }[];
}

function buildMap(config: string): MapConfig {
  const base: Omit<MapConfig, 'continents' | 'deposits' | 'oceanLabels'> = {
    viewBox: '0 0 760 500',
    oceanColor: '#0a1f35',
    landColor: '#2d4a1e',
    landStroke: '#4a7a2a',
    subductionZones: [],
    ridges: [],
    transforms: [],
  };

  const maps: Record<string, MapConfig> = {
    present: {
      ...base,
      oceanLabels: [{ x:120, y:250, text:'PACIFIC OCEAN' }, { x:340, y:200, text:'ATLANTIC' }, { x:560, y:280, text:'INDIAN OCEAN' }],
      subductionZones: [{ d:'M 60,120 Q 70,200 80,280 Q 85,340 90,390' }, { d:'M 660,100 Q 670,180 675,260' }],
      ridges: [{ d:'M 300,80 Q 310,180 305,280 Q 300,350 295,430' }, { d:'M 580,200 Q 600,260 590,320' }],
      transforms: [{ d:'M 280,260 Q 290,265 300,260' }, { d:'M 560,300 Q 580,305 600,300' }],
      continents: [
        { id:'na', d:'M 100,80 Q 140,60 200,75 Q 240,80 260,120 Q 270,160 250,200 Q 230,240 200,250 Q 160,260 130,240 Q 100,220 90,180 Q 80,140 100,80 Z', label:{ x:170, y:165, text:'NORTH\nAMERICA' } },
        { id:'sa', d:'M 170,270 Q 210,260 230,290 Q 245,320 240,370 Q 235,420 210,440 Q 180,450 160,420 Q 140,380 145,330 Q 150,290 170,270 Z', label:{ x:195, y:360, text:'SOUTH\nAMERICA' } },
        { id:'eu', d:'M 330,60 Q 380,50 420,70 Q 450,85 440,120 Q 430,140 400,145 Q 360,148 340,130 Q 320,110 330,60 Z', label:{ x:385, y:105, text:'EUROPE' } },
        { id:'af', d:'M 340,140 Q 390,130 420,155 Q 450,175 455,220 Q 460,270 450,320 Q 440,370 415,400 Q 385,420 355,400 Q 325,375 320,320 Q 315,260 325,205 Q 330,165 340,140 Z', label:{ x:388, y:270, text:'AFRICA' } },
        { id:'as', d:'M 420,55 Q 510,40 580,60 Q 640,78 660,120 Q 670,165 640,195 Q 590,215 540,200 Q 480,180 445,155 Q 420,135 420,95 Q 420,70 420,55 Z', label:{ x:545, y:128, text:'ASIA' } },
        { id:'au', d:'M 540,310 Q 590,295 630,315 Q 660,330 655,375 Q 648,415 610,425 Q 570,432 545,405 Q 520,375 530,340 Q 535,320 540,310 Z', label:{ x:590, y:365, text:'AUSTRALIA' } },
        { id:'an', d:'M 220,460 Q 280,455 340,462 Q 400,470 420,478 Q 380,490 300,492 Q 230,490 210,480 Q 215,468 220,460 Z', label:{ x:315, y:475, text:'ANTARCTICA' } },
      ],
      deposits: [
        { cx:195, cy:85, type:'known', label:'Thacker Pass' }, { cx:175, cy:340, type:'known', label:'Atacama' },
        { cx:375, cy:300, type:'known', label:'Kenticha' }, { cx:390, cy:265, type:'high', label:'DRC Cu Belt' },
        { cx:415, cy:340, type:'known', label:'Kabanga' }, { cx:560, cy:320, type:'known', label:'Mount Weld' },
        { cx:575, cy:295, type:'known', label:'Pilgangoora' }, { cx:350, cy:175, type:'high', label:'Morocco Co' },
        { cx:200, cy:215, type:'mod', label:'Brazil Ni' }, { cx:620, cy:110, type:'mod', label:'Norilsk' },
      ],
    },

    eocene: {
      ...base,
      oceanLabels: [{ x:110, y:240, text:'PROTO-PACIFIC' }, { x:320, y:210, text:'ATLANTIC' }, { x:540, y:250, text:'TETHYS SEA' }],
      subductionZones: [{ d:'M 55,100 Q 60,200 65,300 Q 68,360 70,400' }, { d:'M 680,90 Q 685,170 680,240' }],
      ridges: [{ d:'M 295,70 Q 300,175 296,275 Q 292,360 288,440' }, { d:'M 565,190 Q 580,250 570,310' }],
      transforms: [{ d:'M 275,250 Q 285,255 295,250' }],
      continents: [
        { id:'na', d:'M 95,75 Q 135,55 195,72 Q 235,78 252,118 Q 262,155 244,195 Q 226,232 196,242 Q 158,252 128,234 Q 98,215 88,176 Q 78,135 95,75 Z', label:{ x:168, y:160, text:'NORTH\nAMERICA' } },
        { id:'sa', d:'M 162,262 Q 202,252 222,282 Q 237,312 232,362 Q 227,412 202,432 Q 172,442 152,412 Q 132,372 137,322 Q 142,282 162,262 Z', label:{ x:188, y:350, text:'SOUTH\nAMERICA' } },
        { id:'eu', d:'M 325,62 Q 375,52 412,72 Q 440,86 430,118 Q 420,138 392,142 Q 354,145 335,128 Q 316,108 325,62 Z', label:{ x:378, y:103, text:'EUROPE' } },
        { id:'af', d:'M 335,142 Q 382,132 415,158 Q 442,178 448,225 Q 452,275 440,325 Q 428,372 405,400 Q 375,420 345,400 Q 318,375 312,318 Q 308,256 318,200 Q 325,162 335,142 Z', label:{ x:380, y:268, text:'AFRICA' } },
        { id:'in', d:'M 485,195 Q 515,185 535,205 Q 550,222 542,252 Q 530,272 508,272 Q 488,268 480,245 Q 474,220 485,195 Z', label:{ x:512, y:232, text:'INDIA' } },
        { id:'as', d:'M 415,52 Q 505,38 575,58 Q 632,76 650,118 Q 658,160 628,188 Q 578,208 528,192 Q 470,172 438,148 Q 414,128 414,88 Q 414,66 415,52 Z', label:{ x:540, y:122, text:'ASIA' } },
        { id:'au', d:'M 535,305 Q 582,290 622,308 Q 650,324 645,368 Q 638,408 600,418 Q 562,425 538,398 Q 514,368 524,336 Q 530,314 535,305 Z', label:{ x:582, y:358, text:'AUSTRALIA' } },
      ],
      deposits: [
        { cx:388, cy:268, type:'high', label:'Proto-Cu Belt' }, { cx:512, cy:210, type:'high', label:'India REE' },
        { cx:360, cy:310, type:'known', label:'E.Africa' }, { cx:166, cy:335, type:'known', label:'S.America' },
        { cx:580, cy:300, type:'mod', label:'Australia' }, { cx:148, cy:80, type:'mod', label:'N.America' },
        { cx:420, cy:160, type:'low', label:'Tethys Mg' }, { cx:630, cy:108, type:'mod', label:'Siberia' },
      ],
    },

    earlyK: {
      ...base,
      oceanColor: '#0d2040',
      landColor: '#2a4518',
      oceanLabels: [{ x:90, y:220, text:'PACIFIC\nOCEAN' }, { x:340, y:300, text:'TETHYS OCEAN' }, { x:200, y:380, text:'SOUTH\nATLANTIC' }],
      subductionZones: [{ d:'M 50,80 Q 55,180 58,280 Q 60,360 62,420' }, { d:'M 680,100 Q 682,170 679,235' }],
      ridges: [{ d:'M 218,350 Q 222,390 225,430' }, { d:'M 568,220 Q 582,275 574,330' }],
      transforms: [{ d:'M 200,340 Q 212,345 225,340' }],
      continents: [
        { id:'na', d:'M 80,68 Q 125,48 188,66 Q 228,74 244,114 Q 252,150 232,188 Q 212,225 182,234 Q 145,243 115,225 Q 84,204 74,164 Q 64,122 80,68 Z', label:{ x:156, y:154, text:'NORTH\nAMERICA' } },
        { id:'gondwana', d:'M 240,220 Q 290,200 360,195 Q 430,192 500,210 Q 570,230 610,260 Q 640,285 635,330 Q 628,375 595,400 Q 550,422 495,430 Q 430,438 365,430 Q 295,420 248,390 Q 210,360 205,315 Q 200,265 240,220 Z', label:{ x:420, y:315, text:'GONDWANA' } },
        { id:'laurasia', d:'M 300,58 Q 365,42 450,52 Q 530,62 590,85 Q 645,105 650,145 Q 652,180 618,205 Q 565,222 500,212 Q 430,198 375,178 Q 320,155 305,120 Q 295,88 300,58 Z', label:{ x:472, y:128, text:'LAURASIA' } },
      ],
      deposits: [
        { cx:310, cy:240, type:'high', label:'W.Africa Li' }, { cx:380, cy:280, type:'known', label:'Congo Basin' },
        { cx:450, cy:260, type:'high', label:'E.Africa REE' }, { cx:420, cy:340, type:'high', label:'Mozambique' },
        { cx:360, cy:380, type:'mod', label:'S.Africa' }, { cx:510, cy:300, type:'mod', label:'Madagascar' },
        { cx:140, cy:145, type:'mod', label:'N.Am Cu' }, { cx:550, cy:110, type:'mod', label:'Asia REE' },
        { cx:480, cy:200, type:'low', label:'Tethys' }, { cx:240, cy:300, type:'low', label:'S.Am' },
        { cx:600, cy:200, type:'mod', label:'SE Asia' },
      ],
    },

    cretaceous: {
      ...base,
      oceanColor: '#0c1e38',
      landColor: '#2e4a1a',
      oceanLabels: [{ x:85, y:200, text:'PACIFIC' }, { x:250, y:350, text:'SOUTH ATLANTIC' }, { x:520, y:300, text:'TETHYS OCEAN' }],
      subductionZones: [{ d:'M 48,75 Q 52,175 55,275 Q 57,355 59,415' }],
      ridges: [{ d:'M 230,330 Q 234,375 237,420' }, { d:'M 560,215 Q 574,268 566,322' }],
      transforms: [],
      continents: [
        { id:'na', d:'M 78,65 Q 122,46 184,62 Q 223,70 238,110 Q 246,146 227,184 Q 208,220 178,230 Q 141,238 112,220 Q 82,200 72,160 Q 62,118 78,65 Z', label:{ x:152, y:148, text:'N. AMERICA' } },
        { id:'sa', d:'M 148,248 Q 185,238 204,268 Q 218,296 213,344 Q 208,392 184,412 Q 155,422 136,393 Q 117,354 122,305 Q 127,265 148,248 Z', label:{ x:175, y:335, text:'S. AMERICA' } },
        { id:'eurasia', d:'M 295,55 Q 365,40 448,50 Q 525,60 582,82 Q 635,102 640,142 Q 642,178 608,202 Q 556,218 490,208 Q 422,194 368,174 Q 315,150 300,116 Q 290,85 295,55 Z', label:{ x:468, y:125, text:'EURASIA' } },
        { id:'af', d:'M 325,148 Q 370,138 402,162 Q 428,182 432,228 Q 436,278 424,328 Q 412,375 388,402 Q 358,422 328,402 Q 302,378 296,321 Q 292,260 302,205 Q 308,165 325,148 Z', label:{ x:365, y:272, text:'AFRICA' } },
        { id:'in', d:'M 468,192 Q 495,180 514,200 Q 528,216 520,244 Q 508,262 488,262 Q 469,258 462,236 Q 456,212 468,192 Z', label:{ x:494, y:225, text:'INDIA' } },
        { id:'au', d:'M 528,300 Q 574,285 613,303 Q 640,318 635,362 Q 628,402 590,412 Q 553,418 530,392 Q 507,363 516,331 Q 521,308 528,300 Z', label:{ x:575, y:352, text:'AUSTRALIA' } },
        { id:'an', d:'M 260,445 Q 320,440 385,448 Q 440,455 455,464 Q 415,475 340,478 Q 268,475 248,464 Q 252,453 260,445 Z', label:{ x:350, y:462, text:'ANTARCTICA' } },
      ],
      deposits: [
        { cx:345, cy:195, type:'high', label:'W.Af Li' }, { cx:372, cy:265, type:'known', label:'Congo' },
        { cx:400, cy:310, type:'high', label:'E.Af REE' }, { cx:375, cy:370, type:'mod', label:'S.Af' },
        { cx:492, cy:200, type:'high', label:'India REE' }, { cx:565, cy:340, type:'mod', label:'Australia' },
        { cx:152, cy:140, type:'mod', label:'Laramide' }, { cx:600, cy:112, type:'mod', label:'Siberia' },
      ],
    },

    pangaea: {
      ...base,
      oceanColor: '#0e2242',
      landColor: '#3a5520',
      oceanLabels: [{ x:150, y:250, text:'PANTHALASSA\nOCEAN' }, { x:548, y:295, text:'TETHYS SEA' }],
      subductionZones: [{ d:'M 52,100 Q 56,200 58,310' }, { d:'M 650,80 Q 655,160 650,240' }],
      ridges: [],
      transforms: [{ d:'M 490,240 Q 510,248 530,240' }],
      continents: [
        { id:'pangaea', d:'M 255,68 Q 330,48 420,52 Q 500,58 558,80 Q 610,100 625,145 Q 635,188 620,228 Q 600,265 568,285 Q 530,302 488,310 Q 445,318 398,322 Q 348,325 302,318 Q 258,308 228,285 Q 200,260 196,225 Q 192,182 210,148 Q 228,112 255,68 Z', label:{ x:408, y:188, text:'PANGAEA' } },
        { id:'siberia', d:'M 468,55 Q 515,42 560,55 Q 592,66 592,98 Q 588,122 560,130 Q 528,136 502,122 Q 476,106 468,82 Q 464,66 468,55 Z', label:{ x:528, y:90, text:'SIBERIA' } },
      ],
      deposits: [
        { cx:340, cy:180, type:'high', label:'Variscan' }, { cx:420, cy:240, type:'mod', label:'Tethys Cu' },
        { cx:380, cy:300, type:'high', label:'Gondwana' }, { cx:290, cy:220, type:'mod', label:'Appalachian' },
        { cx:530, cy:88, type:'known', label:'Siberian LIP' }, { cx:470, cy:280, type:'low', label:'Ural Belt' },
        { cx:455, cy:145, type:'mod', label:'Tethys' }, { cx:305, cy:140, type:'low', label:'N.Am' },
      ],
    },

    cambrian: {
      ...base,
      oceanColor: '#102445',
      landColor: '#344e1a',
      oceanLabels: [{ x:130, y:220, text:'PANTHALASSA' }, { x:425, y:185, text:'IAPETUS\nOCEAN' }, { x:600, y:320, text:'PROTO-TETHYS' }],
      subductionZones: [{ d:'M 55,110 Q 58,200 60,300' }],
      ridges: [{ d:'M 385,100 Q 395,170 388,248' }],
      transforms: [],
      continents: [
        { id:'gondwana', d:'M 230,245 Q 285,215 358,210 Q 428,208 498,228 Q 558,248 580,292 Q 595,330 580,368 Q 558,402 512,418 Q 458,430 395,428 Q 328,424 278,395 Q 238,365 228,320 Q 218,272 230,245 Z', label:{ x:405, y:320, text:'GONDWANA' } },
        { id:'laurentia', d:'M 95,82 Q 140,64 192,78 Q 228,88 238,122 Q 244,152 224,180 Q 202,205 170,210 Q 132,212 105,190 Q 80,165 76,130 Q 72,96 95,82 Z', label:{ x:158, y:146, text:'LAURENTIA' } },
        { id:'baltica', d:'M 318,72 Q 355,60 388,75 Q 412,88 408,118 Q 402,138 374,145 Q 345,148 326,130 Q 308,110 318,72 Z', label:{ x:360, y:105, text:'BALTICA' } },
        { id:'siberia', d:'M 458,62 Q 500,50 540,64 Q 568,76 565,108 Q 560,130 532,138 Q 500,142 476,125 Q 452,108 458,80 Q 458,68 458,62 Z', label:{ x:512, y:95, text:'SIBERIA' } },
      ],
      deposits: [
        { cx:310, cy:262, type:'high', label:'W.Af Craton' }, { cx:388, cy:295, type:'high', label:'Congo Basin' },
        { cx:455, cy:268, type:'mod', label:'E.Africa' }, { cx:415, cy:380, type:'known', label:'Mozambique' },
        { cx:165, cy:144, type:'low', label:'Laurentia' }, { cx:362, cy:100, type:'low', label:'Baltic' },
        { cx:510, cy:95, type:'mod', label:'Siberia' }, { cx:340, cy:400, type:'mod', label:'S.America' },
      ],
    },

    rodinia: {
      ...base,
      oceanColor: '#0f2244',
      landColor: '#2e4818',
      oceanLabels: [{ x:130, y:250, text:'MIROVIA\nOCEAN' }, { x:580, y:200, text:'PROTO-PACIFIC' }],
      subductionZones: [{ d:'M 52,120 Q 56,220 58,320' }],
      ridges: [{ d:'M 488,380 Q 510,405 530,430' }],
      transforms: [],
      continents: [
        { id:'rodinia', d:'M 230,80 Q 310,52 415,55 Q 510,60 578,90 Q 638,118 648,162 Q 652,205 630,242 Q 600,275 552,290 Q 495,302 430,302 Q 362,300 305,280 Q 252,258 228,225 Q 206,190 208,150 Q 210,110 230,80 Z', label:{ x:428, y:175, text:'RODINIA' } },
      ],
      deposits: [
        { cx:305, cy:185, type:'high', label:'Proto-Gondwana' }, { cx:380, cy:210, type:'high', label:'E.Af Orogen' },
        { cx:430, cy:240, type:'high', label:'Katangan Basin' }, { cx:470, cy:190, type:'mod', label:'Kibaran Belt' },
        { cx:520, cy:165, type:'mod', label:'Damara Zone' }, { cx:355, cy:255, type:'known', label:'Mozambique' },
        { cx:260, cy:150, type:'low', label:'W.Africa' }, { cx:580, cy:130, type:'low', label:'Laurentia' },
      ],
    },
  };

  return maps[config] || maps['earlyK'];
}

// ── Deposit marker colors ──────────────────────────────────────
const DEPOSIT_COLORS = {
  known: '#a78bfa',
  high:  '#f87171',
  mod:   '#fbbf24',
  low:   '#34d399',
};

// ── Heatmap SVG (procedural noise-like gradient) ───────────────
function ProspectivityHeatmap() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="h1" cx="40%" cy="45%" r="35%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95"/>
          <stop offset="60%" stopColor="#f97316" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="h2" cx="65%" cy="38%" r="28%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85"/>
          <stop offset="50%" stopColor="#f97316" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="h3" cx="55%" cy="65%" r="32%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.8"/>
          <stop offset="55%" stopColor="#eab308" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="h4" cx="20%" cy="60%" r="22%">
          <stop offset="0%" stopColor="#eab308" stopOpacity="0.7"/>
          <stop offset="60%" stopColor="#22c55e" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="h5" cx="80%" cy="70%" r="18%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.65"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="#0a0f1a"/>
      <rect width="280" height="160" fill="url(#h4)" opacity="0.9"/>
      <rect width="280" height="160" fill="url(#h3)" opacity="0.9"/>
      <rect width="280" height="160" fill="url(#h2)" opacity="0.9"/>
      <rect width="280" height="160" fill="url(#h1)" opacity="0.9"/>
      {/* Grid overlay */}
      {Array.from({length:8}).map((_,i) => (
        <line key={`v${i}`} x1={i*40} y1="0" x2={i*40} y2="160" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
      ))}
      {Array.from({length:5}).map((_,i) => (
        <line key={`h${i}`} x1="0" y1={i*40} x2="280" y2={i*40} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
      ))}
      {/* Scale bar */}
      <defs>
        <linearGradient id="scale" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22c55e"/>
          <stop offset="50%" stopColor="#f97316"/>
          <stop offset="100%" stopColor="#ef4444"/>
        </linearGradient>
      </defs>
      <rect x="20" y="148" width="240" height="6" rx="3" fill="url(#scale)"/>
      <text x="20" y="144" fill="#475569" fontSize="7" fontFamily="Inter,sans-serif">Low</text>
      <text x="246" y="144" fill="#475569" fontSize="7" fontFamily="Inter,sans-serif">High</text>
    </svg>
  );
}

// ── Radial prospectivity gauge ─────────────────────────────────
function ProspGauge({ score, level }: { score: number; level: string }) {
  const r = 48;
  const cx = 64, cy = 64;
  const circumference = 2 * Math.PI * r;
  const pct = score / 100;
  const gaugeDash = circumference * 0.75;
  const scoreDash = gaugeDash * pct;
  const rotation = -225;
  const levelColor = level === 'High' ? '#22c55e' : level === 'Moderate' ? '#f97316' : '#60a5fa';

  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"
        strokeDasharray={`${gaugeDash} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${cx} ${cy})`}/>
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={levelColor} strokeWidth="10"
        strokeDasharray={`${scoreDash} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${cx} ${cy})`}
        style={{ filter:`drop-shadow(0 0 6px ${levelColor}80)` }}/>
      <text x={cx} y={cy-4} textAnchor="middle" fill="#fff" fontSize="22" fontWeight="700" fontFamily="Inter,sans-serif">{score}</text>
      <text x={cx} y={cy+14} textAnchor="middle" fill={levelColor} fontSize="11" fontWeight="600" fontFamily="Inter,sans-serif">{level}</text>
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function PaleoExplorer() {
  const [selectedMa, setSelectedMa] = useState(120);
  const [mapView, setMapView] = useState<'Paleogeographic' | 'Tectonic' | 'Prospectivity'>('Paleogeographic');
  const [validationMode, setValidationMode] = useState<'off' | 'predictions' | 'overlay'>('off');
  const [hoveredDeposit, setHoveredDeposit] = useState<string | null>(null);

  const period = useMemo(
    () => PERIODS.find(p => p.ma === selectedMa) || PERIODS[3],
    [selectedMa]
  );
  const mapCfg = useMemo(() => buildMap(period.continentConfig), [period]);
  const regions = REGIONS[period.continentConfig] || REGIONS['earlyK'];

  const maStops = [750, 500, 250, 120, 100, 50, 0];
  const sliderPct = (750 - selectedMa) / 750;

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const nearest = maStops.reduce((prev, curr) =>
      Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
    );
    setSelectedMa(nearest);
  }, []);

  const S = {
    container: { width:'100%', height:'100%', background:'#060b14', color:'#e2e8f0', fontFamily:'Inter,sans-serif', display:'flex', flexDirection:'column' as const, overflow:'hidden' },
    header: { padding:'14px 24px 12px', borderBottom:'1px solid rgba(0,234,255,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 as const },
    title: { fontSize:18, fontWeight:700, color:'#e2e8f0', letterSpacing:-.3 },
    subtitle: { fontSize:11, color:'#475569', marginTop:2 },
    body: { flex:1, display:'flex', minHeight:0 },
    left: { flex:1, display:'flex', flexDirection:'column' as const, minWidth:0 },
    right: { width:240, flexShrink:0, borderLeft:'1px solid rgba(255,255,255,0.06)', overflowY:'auto' as const, background:'#070d18' },
    section: (c = 'rgba(0,234,255,0.1)') => ({ borderBottom:`1px solid ${c}`, padding:'14px 16px' }),
    label: { fontSize:9, color:'#00eaff', letterSpacing:'1.5px', fontWeight:700 as const, marginBottom:8, opacity:.75 },
    row: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 },
    rowKey: { fontSize:11, color:'#475569' },
    rowVal: { fontSize:11, color:'#94a3b8', textAlign:'right' as const },
  };

  return (
    <div style={S.container}>
      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <div style={S.title}>PaleoGeographic Explorer</div>
          <div style={S.subtitle}>Explore ancient Earth, deposit formation environments, and AI-powered prospectivity</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Map view selector */}
          <div style={{ display:'flex', gap:4 }}>
            {(['Paleogeographic','Tectonic','Prospectivity'] as const).map(v => (
              <button key={v} onClick={() => setMapView(v)}
                style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontFamily:'Inter,sans-serif', cursor:'pointer', transition:'all .12s',
                  background: mapView===v ? 'rgba(0,234,255,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${mapView===v ? 'rgba(0,234,255,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  color: mapView===v ? '#00eaff' : '#475569',
                }}>
                {v}
              </button>
            ))}
          </div>
          {/* Validation mode button */}
          <button
            onClick={() => setValidationMode(v => v==='off' ? 'predictions' : v==='predictions' ? 'overlay' : 'off')}
            style={{ padding:'5px 14px', borderRadius:6, fontSize:11, fontFamily:'Inter,sans-serif', cursor:'pointer', transition:'all .12s',
              background: validationMode!=='off' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${validationMode!=='off' ? 'rgba(251,191,36,0.45)' : 'rgba(255,255,255,0.08)'}`,
              color: validationMode!=='off' ? '#fbbf24' : '#475569',
            }}>
            {validationMode==='off' ? 'Test Against Known Deposits' : validationMode==='predictions' ? 'Showing Predictions →' : 'Overlay Active ✓'}
          </button>
        </div>
      </div>

      {/* ── Geologic Time Slider ── */}
      <div style={{ padding:'12px 24px 10px', background:'#080d18', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ flexShrink:0, minWidth:180 }}>
            <div style={{ fontSize:9, color:'#00eaff', letterSpacing:'1.4px', fontWeight:700, marginBottom:3 }}>GEOLOGIC TIME</div>
            <div style={{ fontSize:16, fontWeight:700, color:'#e2e8f0', letterSpacing:-.3, lineHeight:1 }}>
              {selectedMa === 0 ? 'Present Day' : `${selectedMa} Million Years Ago`}
            </div>
            <div style={{ fontSize:11, color:'#25f5a6', marginTop:2 }}>{period.epoch}</div>
          </div>
          <div style={{ flex:1, position:'relative' }}>
            {/* Tick labels */}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              {['750 Ma','500 Ma','250 Ma','100 Ma','50 Ma','Present'].map(t => (
                <span key={t} style={{ fontSize:9, color:'#334155', letterSpacing:.3 }}>{t}</span>
              ))}
            </div>
            {/* Slider track */}
            <div style={{ position:'relative', height:20, display:'flex', alignItems:'center' }}>
              {/* Active fill */}
              <div style={{ position:'absolute', left:0, width:`${sliderPct*100}%`, height:3, background:'rgba(0,234,255,0.3)', borderRadius:2 }}/>
              {/* Stop dots */}
              {maStops.map(ma => {
                const pct = (750 - ma) / 750;
                const active = ma === selectedMa;
                return (
                  <div key={ma} onClick={() => setSelectedMa(ma)}
                    style={{ position:'absolute', left:`${pct*100}%`, transform:'translateX(-50%)',
                      width: active ? 14 : 8, height: active ? 14 : 8, borderRadius:'50%',
                      background: active ? '#00eaff' : '#1e3a4a',
                      border: active ? '2px solid #00eaff' : '1px solid #334155',
                      boxShadow: active ? '0 0 10px rgba(0,234,255,0.6)' : 'none',
                      cursor:'pointer', transition:'all .15s', zIndex:2,
                    }}
                  />
                );
              })}
              <input type="range" min={0} max={750} value={selectedMa} onChange={handleSliderChange}
                style={{ position:'absolute', width:'100%', opacity:0, height:20, cursor:'pointer', zIndex:3 }}/>
              <div style={{ width:'100%', height:3, background:'rgba(255,255,255,0.08)', borderRadius:2 }}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={S.body}>
        {/* ── Left: Map + bottom panels ── */}
        <div style={S.left}>
          {/* Map area */}
          <div style={{ flex:1, position:'relative', background:'#0a1525', overflow:'hidden', minHeight:300 }}>
            {/* Recenter button */}
            <button style={{ position:'absolute', top:12, left:12, zIndex:10, padding:'6px 12px', background:'rgba(10,20,40,0.9)', border:'1px solid rgba(0,234,255,0.2)', borderRadius:6, color:'#00eaff', fontSize:11, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6, backdropFilter:'blur(4px)' }}>
              <span style={{ fontSize:14 }}>⊕</span> Recenter Map
            </button>
            {/* Globe icon */}
            <div style={{ position:'absolute', top:12, right:12, zIndex:10, width:32, height:32, background:'rgba(10,20,40,0.9)', border:'1px solid rgba(0,234,255,0.2)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backdropFilter:'blur(4px)', color:'#00eaff', fontSize:16 }}>🌐</div>
            {/* Zoom controls */}
            <div style={{ position:'absolute', top:52, right:12, zIndex:10, display:'flex', flexDirection:'column', gap:2 }}>
              {['+','−','⊞','−−'].map((ic,i) => (
                <div key={i} style={{ width:28, height:28, background:'rgba(10,20,40,0.88)', border:'1px solid rgba(0,234,255,0.15)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#00eaff', fontSize:14, backdropFilter:'blur(4px)' }}>{ic}</div>
              ))}
            </div>

            {/* THE MAP */}
            <svg
              width="100%" height="100%"
              viewBox={mapCfg.viewBox}
              style={{ display:'block' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Ocean background */}
              <rect width="760" height="500" fill={mapCfg.oceanColor}/>
              {/* Ocean atmospheric gradient */}
              <defs>
                <radialGradient id="oceanAtm" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="#1a4060" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#000a18" stopOpacity="0.5"/>
                </radialGradient>
                <filter id="landShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.5"/>
                </filter>
              </defs>
              <rect width="760" height="500" fill="url(#oceanAtm)"/>
              {/* Grid */}
              {Array.from({length:10}).map((_,i) => (
                <line key={`v${i}`} x1={i*76} y1="0" x2={i*76} y2="500" stroke="rgba(0,200,255,0.04)" strokeWidth="0.5"/>
              ))}
              {Array.from({length:7}).map((_,i) => (
                <line key={`h${i}`} x1="0" y1={i*72} x2="760" y2={i*72} stroke="rgba(0,200,255,0.04)" strokeWidth="0.5"/>
              ))}

              {/* Continents */}
              {mapCfg.continents.map(c => (
                <g key={c.id} filter="url(#landShadow)">
                  <path d={c.d}
                    fill={mapView === 'Tectonic' ? '#3a5020' : mapView === 'Prospectivity' ? '#2a4515' : mapCfg.landColor}
                    stroke={mapCfg.landStroke}
                    strokeWidth="1.2"
                    opacity="0.95"/>
                  {/* Relief texture overlay */}
                  <path d={c.d} fill="url(#oceanAtm)" opacity="0.15"/>
                  {c.label && (
                    <text x={c.label.x} y={c.label.y}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.65)"
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="Inter,sans-serif"
                      letterSpacing="1.5"
                      style={{ pointerEvents:'none', userSelect:'none' }}>
                      {c.label.text}
                    </text>
                  )}
                </g>
              ))}

              {/* Subduction zones */}
              {mapCfg.subductionZones.map((z, i) => (
                <path key={`sz${i}`} d={z.d}
                  fill="none" stroke="#f97316" strokeWidth="2.5"
                  strokeDasharray="6 4" opacity="0.7"
                  strokeLinecap="round"/>
              ))}
              {/* Ridges */}
              {mapCfg.ridges.map((r, i) => (
                <path key={`r${i}`} d={r.d}
                  fill="none" stroke="#60a5fa" strokeWidth="1.5"
                  strokeDasharray="3 3" opacity="0.6"/>
              ))}
              {/* Transforms */}
              {mapCfg.transforms.map((t, i) => (
                <path key={`t${i}`} d={t.d}
                  fill="none" stroke="#94a3b8" strokeWidth="1.5"
                  opacity="0.55"/>
              ))}

              {/* Ocean labels */}
              {mapCfg.oceanLabels.map((l, i) => (
                <text key={`ol${i}`} x={l.x} y={l.y}
                  textAnchor="middle"
                  fill="rgba(100,180,220,0.35)"
                  fontSize="11"
                  fontWeight="500"
                  fontFamily="Inter,sans-serif"
                  letterSpacing="4"
                  style={{ pointerEvents:'none', userSelect:'none', textTransform:'uppercase' }}>
                  {l.text}
                </text>
              ))}

              {/* Deposit markers */}
              {mapCfg.deposits.map((dep, i) => {
                const hide = validationMode === 'predictions' && dep.type === 'known';
                const color = DEPOSIT_COLORS[dep.type];
                const hovered = hoveredDeposit === `${dep.cx}-${dep.cy}`;
                return !hide ? (
                  <g key={i}
                    onMouseEnter={() => setHoveredDeposit(`${dep.cx}-${dep.cy}`)}
                    onMouseLeave={() => setHoveredDeposit(null)}
                    style={{ cursor:'pointer' }}>
                    {/* Pulse ring */}
                    <circle cx={dep.cx} cy={dep.cy} r={hovered ? 12 : 8}
                      fill="none" stroke={color} strokeWidth="1"
                      opacity={hovered ? 0.8 : 0.4}
                      style={{ transition:'r .2s, opacity .2s' }}/>
                    {/* Core dot */}
                    <circle cx={dep.cx} cy={dep.cy} r={hovered ? 6 : 4}
                      fill={color}
                      opacity={hovered ? 1 : 0.85}
                      style={{ filter:`drop-shadow(0 0 4px ${color})`, transition:'r .2s' }}/>
                    {/* Label on hover */}
                    {hovered && (
                      <g>
                        <rect x={dep.cx+10} y={dep.cy-14} width={dep.label.length*6+8} height={16}
                          rx="3" fill="rgba(6,11,20,0.92)" stroke={color} strokeWidth="0.5"/>
                        <text x={dep.cx+14} y={dep.cy-3}
                          fill={color} fontSize="9" fontFamily="Inter,sans-serif" fontWeight="600">
                          {dep.label}
                        </text>
                      </g>
                    )}
                  </g>
                ) : null;
              })}

              {/* Validation overlay — show predicted zones */}
              {validationMode !== 'off' && (
                <g opacity="0.35">
                  {mapCfg.deposits.filter(d => d.type !== 'known').map((dep, i) => (
                    <circle key={`pred${i}`} cx={dep.cx} cy={dep.cy} r="18"
                      fill={DEPOSIT_COLORS[dep.type]} opacity="0.15"
                      stroke={DEPOSIT_COLORS[dep.type]} strokeWidth="0.5"/>
                  ))}
                </g>
              )}

              {/* Scale bar */}
              <g transform="translate(610,470)">
                <line x1="0" y1="0" x2="80" y2="0" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                <line x1="0" y1="-4" x2="0" y2="4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                <line x1="80" y1="-4" x2="80" y2="4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                <text x="40" y="-7" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="Inter,sans-serif">1000 km</text>
              </g>
            </svg>

            {/* MAP LEGEND */}
            <div style={{ position:'absolute', bottom:16, left:16, background:'rgba(6,11,20,0.92)', border:'1px solid rgba(0,234,255,0.18)', borderRadius:8, padding:'10px 14px', backdropFilter:'blur(6px)', zIndex:5 }}>
              <div style={{ fontSize:9, color:'#00eaff', letterSpacing:'1.3px', fontWeight:700, marginBottom:8 }}>MAP LEGEND</div>
              {[
                { color:DEPOSIT_COLORS.known, label:'Known Deposits' },
                { color:DEPOSIT_COLORS.high,  label:'High Prospectivity (AI)' },
                { color:DEPOSIT_COLORS.mod,   label:'Moderate Prospectivity' },
                { color:DEPOSIT_COLORS.low,   label:'Low Prospectivity' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, fontSize:10, color:'#94a3b8' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0, boxShadow:`0 0 4px ${color}80` }}/>
                  {label}
                </div>
              ))}
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:6, paddingTop:6 }}>
                {[
                  { color:'#f97316', label:'Subduction Zone', dash:true },
                  { color:'#60a5fa', label:'Ridge', dash:true },
                  { color:'#94a3b8', label:'Transform Fault', dash:false },
                ].map(({ color, label, dash }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, fontSize:10, color:'#94a3b8' }}>
                    <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke={color} strokeWidth="1.5" strokeDasharray={dash ? '4 2' : 'none'}/></svg>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bottom panels strip ── */}
          <div style={{ height:220, flexShrink:0, borderTop:'1px solid rgba(0,234,255,0.1)', display:'flex', background:'#070d18' }}>

            {/* Panel 1: Paleo→Present comparison */}
            <div style={{ flex:1, borderRight:'1px solid rgba(255,255,255,0.06)', padding:'12px 14px', display:'flex', flexDirection:'column' }}>
              <div style={{ fontSize:9, color:'#00eaff', letterSpacing:'1.4px', fontWeight:700, marginBottom:10 }}>PALEO → PRESENT COMPARISON</div>
              <div style={{ flex:1, display:'flex', gap:8, alignItems:'stretch' }}>
                {/* Ancient */}
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ fontSize:9, color:'#475569', letterSpacing:.5 }}>{selectedMa === 0 ? 'Present Day' : `${selectedMa} Ma (${period.label})`}</div>
                  <div style={{ flex:1, background:'#0a1525', borderRadius:6, overflow:'hidden', position:'relative', border:'1px solid rgba(0,234,255,0.1)' }}>
                    <svg width="100%" height="100%" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice">
                      <rect width="120" height="80" fill="#0a1525"/>
                      {mapCfg.continents.map(c => (
                        <path key={c.id} d={c.d} fill="#2a4518" stroke="#3a5a22" strokeWidth="0.8"
                          transform="scale(0.158 0.16)"/>
                      ))}
                    </svg>
                  </div>
                </div>
                {/* Arrow */}
                <div style={{ display:'flex', alignItems:'center', color:'#334155', fontSize:16, flexShrink:0 }}>↔</div>
                {/* Present */}
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ fontSize:9, color:'#475569', letterSpacing:.5 }}>Present Day</div>
                  <div style={{ flex:1, background:'#0a1525', borderRadius:6, overflow:'hidden', position:'relative', border:'1px solid rgba(0,234,255,0.1)' }}>
                    <svg width="100%" height="100%" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice">
                      <rect width="120" height="80" fill="#0a1525"/>
                      {buildMap('present').continents.map(c => (
                        <path key={c.id} d={c.d} fill="#2a4518" stroke="#3a5a22" strokeWidth="0.8"
                          transform="scale(0.158 0.16)"/>
                      ))}
                    </svg>
                  </div>
                </div>
              </div>
              <div style={{ marginTop:6, fontSize:10, color:'#475569', display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ color:'#00eaff' }}>ℹ</span> {period.driftNote}
              </div>
            </div>

            {/* Panel 2: Heatmap */}
            <div style={{ flex:1.2, borderRight:'1px solid rgba(255,255,255,0.06)', padding:'12px 14px', display:'flex', flexDirection:'column' }}>
              <div style={{ fontSize:9, color:'#00eaff', letterSpacing:'1.4px', fontWeight:700, marginBottom:8 }}>PROSPECTIVITY HEATMAP (AI MODEL)</div>
              <div style={{ flex:1, borderRadius:6, overflow:'hidden' }}>
                <ProspectivityHeatmap />
              </div>
            </div>

            {/* Panel 3: Top prospective regions */}
            <div style={{ flex:1, borderRight:'1px solid rgba(255,255,255,0.06)', padding:'12px 14px', display:'flex', flexDirection:'column' }}>
              <div style={{ fontSize:9, color:'#00eaff', letterSpacing:'1.4px', fontWeight:700, marginBottom:10 }}>TOP PROSPECTIVE REGIONS</div>
              <div style={{ flex:1, overflowY:'auto' }}>
                {regions.map(({ name, score }, i) => (
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, padding:'5px 8px', background:'rgba(255,255,255,0.02)', borderRadius:5, cursor:'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,234,255,0.04)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}>
                    <span style={{ fontSize:10, color:'#334155', fontWeight:700, minWidth:14 }}>{i+1}</span>
                    <span style={{ flex:1, fontSize:11, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                    <span style={{ padding:'2px 7px', background:'rgba(37,245,166,0.1)', border:'1px solid rgba(37,245,166,0.3)', borderRadius:10, fontSize:10, color:'#25f5a6', fontWeight:700 }}>{score}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => {}}
                style={{ marginTop:8, width:'100%', padding:'6px', background:'transparent', border:'1px solid rgba(0,234,255,0.2)', borderRadius:6, color:'#00eaff', fontSize:10, cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                View Full Rankings →
              </button>
            </div>

            {/* Panel 4: Data coverage */}
            <div style={{ flex:1, padding:'12px 14px', display:'flex', flexDirection:'column' }}>
              <div style={{ fontSize:9, color:'#00eaff', letterSpacing:'1.4px', fontWeight:700, marginBottom:10 }}>DATA COVERAGE</div>
              {[
                { label:'Geologic Maps',       pct:87, color:'#25f5a6' },
                { label:'Geochemistry',         pct:64, color:'#f97316' },
                { label:'Remote Sensing',       pct:92, color:'#25f5a6' },
                { label:'Paleo Model Confidence', pct:78, color:'#fbbf24', tag:'High' },
              ].map(({ label, pct, color, tag }) => (
                <div key={label} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:10, color:'#475569' }}>{label}</span>
                    <span style={{ fontSize:10, color, fontWeight:600 }}>{tag || `${pct}%`}</span>
                  </div>
                  <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:2, boxShadow:`0 0 6px ${color}60`, transition:'width .5s' }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Data Sources Footer ── */}
          <div style={{ padding:'8px 20px', background:'#050a12', borderTop:'1px solid rgba(0,234,255,0.07)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <span style={{ fontSize:9, color:'#334155', letterSpacing:.5 }}>PaleoGeographic data from</span>
            {['GPlates (EarthByte)', 'USGS MRDS', 'Macrostrat', 'Sentinel-2', 'OneGeology'].map((src, i) => (
              <span key={src} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:9, color:'#475569', letterSpacing:.3 }}>{src}</span>
                {i < 4 && <span style={{ color:'#1e3a4a', fontSize:9 }}>·</span>}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={S.right}>

          {/* Time period details */}
          <div style={S.section()}>
            <div style={S.label}>TIME PERIOD DETAILS</div>
            <div style={{ fontSize:16, fontWeight:700, color:'#e2e8f0', marginBottom:2, letterSpacing:-.2 }}>{period.label}</div>
            <div style={{ fontSize:11, color:'#475569', marginBottom:12 }}>{period.ma === 0 ? '0 Ma' : `${period.ma} Ma`}</div>
            {[
              ['Period',           period.label.split(' ').pop() || '—'],
              ['Epoch',            period.epoch],
              ['Age Range',        period.ageRange],
              ['Global Temperature', period.temperature],
              ['Sea Level',        period.seaLevel],
            ].map(([k, v]) => (
              <div key={k} style={S.row}>
                <span style={S.rowKey}>{k}</span>
                <span style={{ ...S.rowVal, color: v.includes('↑↑↑') ? '#ef4444' : v.includes('↑↑') ? '#f97316' : v.includes('↑') ? '#fbbf24' : v.includes('↓↓') ? '#60a5fa' : '#94a3b8' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Deposit environment insights */}
          <div style={S.section()}>
            <div style={S.label}>DEPOSIT ENVIRONMENT INSIGHTS</div>
            <p style={{ fontSize:11, color:'#64748b', lineHeight:1.6, marginBottom:10 }}>
              During the {period.label}, {period.ma > 200 ? 'continental assembly and supercontinent dynamics created' : 'continental rifting and tectonic activity created'} favorable environments for:
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {period.insights.map(ins => (
                <div key={ins} style={{ display:'flex', alignItems:'flex-start', gap:6, fontSize:11, color:'#94a3b8', lineHeight:1.5 }}>
                  <span style={{ color:'#00eaff', marginTop:1, flexShrink:0 }}>·</span>
                  {ins}
                </div>
              ))}
            </div>
          </div>

          {/* AI Prospectivity Summary */}
          <div style={S.section()}>
            <div style={S.label}>AI PROSPECTIVITY SUMMARY</div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <ProspGauge score={period.prospectivityScore} level={period.prospectivityLevel}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:'#475569', marginBottom:6 }}>Overall Prospectivity Score</div>
                {[
                  { label:'High',     pct:period.prospectivityHigh, color:'#ef4444' },
                  { label:'Moderate', pct:period.prospectivityMod,  color:'#f97316' },
                  { label:'Low',      pct:period.prospectivityLow,  color:'#22c55e' },
                ].map(({ label, pct, color }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }}/>
                    <span style={{ fontSize:10, color:'#475569', flex:1 }}>{label}</span>
                    <span style={{ fontSize:10, color, fontWeight:600 }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Period navigation */}
          <div style={{ padding:'12px 16px' }}>
            <div style={{ fontSize:9, color:'#334155', letterSpacing:'1.2px', fontWeight:600, marginBottom:8 }}>JUMP TO PERIOD</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {PERIODS.map(p => (
                <button key={p.ma} onClick={() => setSelectedMa(p.ma)}
                  style={{ width:'100%', padding:'6px 10px', borderRadius:6, fontSize:11, fontFamily:'Inter,sans-serif', cursor:'pointer', textAlign:'left', transition:'all .12s',
                    background: selectedMa===p.ma ? 'rgba(0,234,255,0.1)' : 'transparent',
                    border: `1px solid ${selectedMa===p.ma ? 'rgba(0,234,255,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    color: selectedMa===p.ma ? '#00eaff' : '#475569',
                  }}>
                  <span style={{ fontWeight:600 }}>{p.ma === 0 ? 'Present' : `${p.ma} Ma`}</span>
                  <span style={{ marginLeft:8, color: selectedMa===p.ma ? '#4db8cc' : '#334155' }}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
