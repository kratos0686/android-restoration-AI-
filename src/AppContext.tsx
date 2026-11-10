import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import {
  AppUser,
  ChecklistTask,
  FieldUnit,
  GeocodingGranularity,
  LossClass,
  MoistureMapPin,
  Permission,
  PlacedEquipment,
  Project,
  ProjectStage,
  Reading,
  Role,
  ROLE_PERMISSIONS,
  Room,
  ScopeLineItem,
  SignedAuthorization,
  WaterCategory,
} from './types';
import {
  calculateDewPointF,
  calculateGPP,
  calculateVaporPressureInHg,
} from './utils/equipmentSizing';
import { generateAdaptiveChecklist } from './services/adaptiveMitigationEngine';
import { indexedDbStorage } from './services/indexedDbStorage';
import { syncService } from './services/SyncService';
import { eventBus } from './services/EventBus';

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj_austin_8841',
    lossNumber: 'LOSS-2026-8841',
    companyId: 'comp_obsidian_01',
    ownerId: 'tech_merrill_01',
    clientName: 'Vance Commercial Holdings — Suite 1400',
    clientPhone: '(512) 555-0194',
    clientEmail: 'facilities@vanceholdings.com',
    insuranceCarrier: 'Chubb Commercial Property',
    claimNumber: 'CLM-994821-TX',
    adjusterName: 'Marcus Vance, AIC',
    lossAddress: '600 Congress Ave, Suite 1400, Austin, TX 78701, USA',
    latitude: 30.2686,
    longitude: -97.7426,
    granularity: 'ROOFTOP',
    placeId: 'ChIJ7aV_n5m1RIYR9s6X9uX2nB8',
    waterCategory: 'CAT_2',
    lossClass: 'CLASS_2',
    moldCondition: 'CONDITION_2',
    stage: 'Stabilize',
    assignedUnitId: 'unit_alpha_01',
    slaPriority: 'Emergency 60m',
    dispatchDirective: 'S500 §12.1 Critical Containment + LGR Grain Depression & 24" Flood Cut',
    createdAt: '2026-11-08T08:30:00.000Z',
    updatedAt: '2026-11-09T18:15:00.000Z',
    syncState: 'Synced',
    rooms: [
      {
        id: 'room_main_salon',
        name: 'Executive Boardroom & Corridor',
        lengthFt: 28,
        widthFt: 20,
        heightFt: 10,
        areaSqFt: 560,
        volumeCuFt: 5600,
        flooringMaterial: 'Engineered White Oak / Concrete Slab',
        wallMaterial: '5/8" Type X Gypsum Board',
        trimMaterial: '4" Architectural MDF Baseboard',
        wetAreaSqFt: 340,
        svgRect: { x: 8, y: 10, width: 52, height: 48 },
      },
      {
        id: 'room_server_annex',
        name: 'IDF Breakroom & Riser Closet',
        lengthFt: 18,
        widthFt: 14,
        heightFt: 10,
        areaSqFt: 252,
        volumeCuFt: 2520,
        flooringMaterial: 'VCT Commercial Tile',
        wallMaterial: '1/2" Moisture-Resistant Drywall',
        trimMaterial: 'Rubber Cove Base',
        wetAreaSqFt: 190,
        svgRect: { x: 62, y: 10, width: 30, height: 48 },
      },
      {
        id: 'room_south_lobby',
        name: 'South Reception Gallery',
        lengthFt: 32,
        widthFt: 16,
        heightFt: 10,
        areaSqFt: 512,
        volumeCuFt: 5120,
        flooringMaterial: 'Porcelain Large-Format Slab',
        wallMaterial: '5/8" Gypsum Drywall',
        trimMaterial: 'Brushed Aluminum Reveal Base',
        wetAreaSqFt: 140,
        svgRect: { x: 8, y: 60, width: 84, height: 30 },
      },
    ],
    pins: [
      {
        id: 'pin_1',
        number: 1,
        roomId: 'room_main_salon',
        roomName: 'Executive Boardroom & Corridor',
        x: 0.24,
        y: 0.28,
        materialId: 'mat_1',
        materialName: 'North Wall 5/8" Gypsum Board',
        substrate: 'Drywall over Steel Stud',
        mcPercent: 31.4,
        dryGoalPercent: 12.0,
        status: 'wet',
        updatedAt: '2026-11-09T17:30:00.000Z',
        history: [
          {
            id: 'h-101',
            mcPercent: 42.0,
            tempF: 76.2,
            rhPercent: 64.0,
            gpp: 88.4,
            recordedAt: '2026-11-08T09:00:00.000Z',
            technician: 'Alex Merrill, WRT/ASD',
          },
          {
            id: 'h-102',
            mcPercent: 31.4,
            tempF: 74.8,
            rhPercent: 46.2,
            gpp: 59.8,
            recordedAt: '2026-11-09T17:30:00.000Z',
            technician: 'Alex Merrill, WRT/ASD',
          },
        ],
      },
      {
        id: 'pin_2',
        number: 2,
        roomId: 'room_server_annex',
        roomName: 'IDF Breakroom & Riser Closet',
        x: 0.74,
        y: 0.32,
        materialId: 'mat_2',
        materialName: 'Riser Chase Sill Plate & Subfloor',
        substrate: 'Kiln-Dried Southern Yellow Pine',
        mcPercent: 19.6,
        dryGoalPercent: 12.0,
        status: 'drying',
        updatedAt: '2026-11-09T17:45:00.000Z',
        history: [
          {
            id: 'h-201',
            mcPercent: 28.5,
            tempF: 75.0,
            rhPercent: 58.0,
            gpp: 76.1,
            recordedAt: '2026-11-08T10:00:00.000Z',
            technician: 'Alex Merrill, WRT/ASD',
          },
          {
            id: 'h-202',
            mcPercent: 19.6,
            tempF: 73.5,
            rhPercent: 42.0,
            gpp: 52.1,
            recordedAt: '2026-11-09T17:45:00.000Z',
            technician: 'Alex Merrill, WRT/ASD',
          },
        ],
      },
      {
        id: 'pin_3',
        number: 3,
        roomId: 'room_south_lobby',
        roomName: 'South Reception Gallery',
        x: 0.48,
        y: 0.74,
        materialId: 'mat_3',
        materialName: 'South Perimeter Partition Wall',
        substrate: 'Drywall / Vapor Retarder',
        mcPercent: 11.2,
        dryGoalPercent: 12.0,
        status: 'dry',
        updatedAt: '2026-11-09T18:00:00.000Z',
        history: [
          {
            id: 'h-301',
            mcPercent: 18.4,
            tempF: 74.0,
            rhPercent: 51.0,
            gpp: 64.2,
            recordedAt: '2026-11-08T11:00:00.000Z',
            technician: 'Alex Merrill, WRT/ASD',
          },
          {
            id: 'h-302',
            mcPercent: 11.2,
            tempF: 72.8,
            rhPercent: 38.5,
            gpp: 46.4,
            recordedAt: '2026-11-09T18:00:00.000Z',
            technician: 'Alex Merrill, WRT/ASD',
          },
        ],
      },
    ],
    materials: [
      {
        id: 'mat_1',
        roomId: 'room_main_salon',
        roomName: 'Executive Boardroom & Corridor',
        name: 'North Wall 5/8" Gypsum Board',
        assemblyType: 'Drywall',
        currentMcPercent: 31.4,
        dryGoalPercent: 12.0,
        status: 'Wet',
        salvageable: false,
        notes: 'CAT 2 wicking >24" above slab; scheduled for 24" flood cut per S500 §13.5.3',
      },
      {
        id: 'mat_2',
        roomId: 'room_server_annex',
        roomName: 'IDF Breakroom & Riser Closet',
        name: 'Riser Chase Sill Plate & Subfloor',
        assemblyType: 'Framing',
        currentMcPercent: 19.6,
        dryGoalPercent: 12.0,
        status: 'Drying',
        salvageable: true,
        notes: 'HEPA vacuumed & treated with EPA-registered quaternary biocide',
      },
      {
        id: 'mat_3',
        roomId: 'room_south_lobby',
        roomName: 'South Reception Gallery',
        name: 'South Perimeter Partition Wall',
        assemblyType: 'Drywall',
        currentMcPercent: 11.2,
        dryGoalPercent: 12.0,
        status: 'Dry',
        salvageable: true,
        notes: 'Reached Dry Standard (<12.0% MC)',
      },
    ],
    readings: [
      {
        id: 'rd_101',
        projectId: 'proj_austin_8841',
        roomId: 'room_main_salon',
        roomName: 'Executive Boardroom & Corridor',
        timestamp: '2026-11-08T09:00:00.000Z',
        tempF: 76.2,
        rhPercent: 64.0,
        gpp: 86.5,
        dewPointF: 63.1,
        vaporPressureInHg: 0.58,
        mcPercent: 42.0,
        technician: 'Alex Merrill, WRT/ASD',
      },
      {
        id: 'rd_102',
        projectId: 'proj_austin_8841',
        roomId: 'room_main_salon',
        roomName: 'Executive Boardroom & Corridor',
        timestamp: '2026-11-08T21:00:00.000Z',
        tempF: 75.4,
        rhPercent: 52.8,
        gpp: 69.2,
        dewPointF: 57.1,
        vaporPressureInHg: 0.47,
        mcPercent: 36.2,
        technician: 'Alex Merrill, WRT/ASD',
      },
      {
        id: 'rd_103',
        projectId: 'proj_austin_8841',
        roomId: 'room_main_salon',
        roomName: 'Executive Boardroom & Corridor',
        timestamp: '2026-11-09T09:00:00.000Z',
        tempF: 74.8,
        rhPercent: 44.5,
        gpp: 56.9,
        dewPointF: 51.8,
        vaporPressureInHg: 0.39,
        mcPercent: 31.4,
        technician: 'Alex Merrill, WRT/ASD',
      },
      {
        id: 'rd_104',
        projectId: 'proj_austin_8841',
        roomId: 'room_server_annex',
        roomName: 'IDF Breakroom & Riser Closet',
        timestamp: '2026-11-09T17:30:00.000Z',
        tempF: 73.5,
        rhPercent: 39.2,
        gpp: 47.9,
        dewPointF: 47.4,
        vaporPressureInHg: 0.33,
        mcPercent: 19.6,
        technician: 'Alex Merrill, WRT/ASD',
      },
    ],
    equipment: [
      {
        id: 'eq_austin_01',
        projectId: 'proj_austin_8841',
        roomId: 'room_main_salon',
        roomName: 'Executive Boardroom & Corridor',
        type: 'LGR_DEHU',
        model: 'Dri-Eaz LGR 7000XLi (130 PPD AHAM)',
        serialNumber: 'D7000-AX9102',
        ampDraw: 8.3,
        dailyRate: 145,
        runtimeHours: 36,
        ahamPpd: 130,
        status: 'Running',
        circuitId: 'PANEL-A CKT-04 (15A)',
        syncState: 'Synced',
        updatedAt: '2026-11-09T17:00:00.000Z',
      },
      {
        id: 'eq_austin_02',
        projectId: 'proj_austin_8841',
        roomId: 'room_main_salon',
        roomName: 'Executive Boardroom & Corridor',
        type: 'AIR_MOVER',
        model: 'Phoenix AirMax Low-Profile Radial',
        serialNumber: 'PAM-44108',
        ampDraw: 1.9,
        dailyRate: 38,
        runtimeHours: 36,
        cfm: 925,
        status: 'Running',
        circuitId: 'PANEL-A CKT-04 (15A)',
        syncState: 'Synced',
        updatedAt: '2026-11-09T17:00:00.000Z',
      },
      {
        id: 'eq_austin_03',
        projectId: 'proj_austin_8841',
        roomId: 'room_server_annex',
        roomName: 'IDF Breakroom & Riser Closet',
        type: 'HEPA_SCRUBBER',
        model: 'Dri-Eaz DefendAir HEPA 500 AFD',
        serialNumber: 'HEPA-500-9914',
        ampDraw: 3.0,
        dailyRate: 120,
        runtimeHours: 36,
        cfm: 500,
        status: 'Running',
        circuitId: 'PANEL-B CKT-09 (15A)',
        syncState: 'Synced',
        updatedAt: '2026-11-09T17:00:00.000Z',
      },
      {
        id: 'eq_austin_04',
        projectId: 'proj_austin_8841',
        roomId: 'room_server_annex',
        roomName: 'IDF Breakroom & Riser Closet',
        type: 'LGR_DEHU',
        model: 'Phoenix DryMAX XL LGR (125 PPD AHAM)',
        serialNumber: 'DMX-88219',
        ampDraw: 8.0,
        dailyRate: 145,
        runtimeHours: 36,
        ahamPpd: 125,
        status: 'Running',
        circuitId: 'PANEL-B CKT-09 (15A)',
        syncState: 'Synced',
        updatedAt: '2026-11-09T17:00:00.000Z',
      },
    ],
    checklist: generateAdaptiveChecklist('CAT_2', 'CLASS_2'),
    scopeItems: [
      {
        id: 'scp_1',
        xactCode: 'WTR EXTRT',
        category: 'Water Extraction',
        description: 'Water extraction from hard surface floor - CAT 2 gray water (weighted pass)',
        quantity: 730,
        unit: 'SF',
        unitPrice: 0.68,
        total: 496.4,
        roomName: 'Executive Boardroom & Corridor',
        iicrcJustification: 'ANSI/IICRC S500 §13.1 — Physical extraction is 500x more efficient than evaporation.',
      },
      {
        id: 'scp_2',
        xactCode: 'WTR DRYWLF',
        category: 'Demolition',
        description: 'Tear out wet drywall, cleanup, bag for CAT 2 disposal - up to 2 ft flood cut',
        quantity: 48,
        unit: 'LF',
        unitPrice: 12.85,
        total: 616.8,
        roomName: 'Executive Boardroom & Corridor',
        iicrcJustification: 'ANSI/IICRC S500 §13.5.3 — Porous gypsum wallboard wicking >30% MC from CAT 2 source.',
      },
      {
        id: 'scp_3',
        xactCode: 'WTR GRMB',
        category: 'Antimicrobial',
        description: 'Apply plant-based / EPA-registered antimicrobial agent to exposed framing & slab',
        quantity: 730,
        unit: 'SF',
        unitPrice: 0.44,
        total: 321.2,
        roomName: 'IDF Breakroom & Riser Closet',
        iicrcJustification: 'ANSI/IICRC S500 §14.2 — Biocide application after HEPA vacuuming of exposed framing.',
      },
      {
        id: 'scp_4',
        xactCode: 'WTR DHM>>',
        category: 'Equipment Rental',
        description: 'Dehumidifier (LGR 110–159 PPD AHAM) - per 24 hr period (2 units x 3 days)',
        quantity: 6,
        unit: 'DA',
        unitPrice: 145.0,
        total: 870.0,
        roomName: 'Chamber-Wide',
        iicrcJustification: 'ANSI/IICRC S500 §15.1 — Class 2 divisor (50 CF) requires 265 PPD AHAM capacity.',
      },
      {
        id: 'scp_5',
        xactCode: 'WTR NAFAN',
        category: 'Negative Air / HEPA',
        description: 'Negative air fan / Air scrubber (500 CFM HEPA AFD) - per 24 hr period',
        quantity: 3,
        unit: 'DA',
        unitPrice: 120.0,
        total: 360.0,
        roomName: 'IDF Breakroom & Riser Closet',
        iicrcJustification: 'ANSI/IICRC S520 §12.3 — Continuous 6 ACH HEPA filtration inside critical barrier.',
      },
    ],
    authorizations: [
      {
        id: 'auth_init_01',
        projectId: 'proj_austin_8841',
        signerName: 'Elena Vance (VP Operations)',
        signerRole: 'Property Owner',
        authorizationType: 'Work Authorization & Direction to Pay',
        signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        verificationHash: '8F4A92C1E70B3D1154829A0E6B1C4F89302D7E5A1198C4B62019F8E3D4C7A9B2',
        signedAt: '2026-11-08T08:45:00.000Z',
      },
    ],
  },
  {
    id: 'proj_austin_8842',
    lossNumber: 'LOSS-2026-8842',
    companyId: 'comp_obsidian_01',
    ownerId: 'tech_merrill_01',
    clientName: 'Barton Creek Medical Plaza — Radiology Wing',
    clientPhone: '(512) 555-0821',
    clientEmail: 'plantops@bartoncreekmed.org',
    insuranceCarrier: 'Travelers Commercial',
    claimNumber: 'TRV-774190-TX',
    adjusterName: 'Sarah Jenkins',
    lossAddress: '100 Congress Ave, Austin, TX 78701, USA',
    latitude: 30.2638,
    longitude: -97.7438,
    granularity: 'ROOFTOP',
    waterCategory: 'CAT_3',
    lossClass: 'CLASS_3',
    moldCondition: 'CONDITION_3',
    stage: 'Inspection',
    slaPriority: 'Emergency 60m',
    createdAt: '2026-11-09T14:20:00.000Z',
    updatedAt: '2026-11-09T19:00:00.000Z',
    syncState: 'Synced',
    rooms: [
      {
        id: 'room_rad_1',
        name: 'Imaging Suite B & Sub-Corridor',
        lengthFt: 30,
        widthFt: 22,
        heightFt: 11,
        areaSqFt: 660,
        volumeCuFt: 7260,
        flooringMaterial: 'Sheet Vinyl Welded Seam',
        wallMaterial: '5/8" Lead-Lined Gypsum',
        trimMaterial: 'Integral Flash Cove',
        wetAreaSqFt: 520,
        svgRect: { x: 10, y: 12, width: 80, height: 74 },
      },
    ],
    pins: [
      {
        id: 'pin_201',
        number: 1,
        roomId: 'room_rad_1',
        roomName: 'Imaging Suite B & Sub-Corridor',
        x: 0.45,
        y: 0.48,
        materialId: 'mat_201',
        materialName: 'Sanitary Riser Backflow Partition',
        substrate: 'Gypsum / Acoustic Cavity Insulation',
        mcPercent: 48.5,
        dryGoalPercent: 12.0,
        status: 'wet',
        updatedAt: '2026-11-09T18:50:00.000Z',
        history: [
          {
            id: 'h-401',
            mcPercent: 48.5,
            tempF: 78.1,
            rhPercent: 68.4,
            gpp: 98.2,
            recordedAt: '2026-11-09T18:50:00.000Z',
            technician: 'Alex Merrill, WRT/ASD',
          },
        ],
      },
    ],
    materials: [
      {
        id: 'mat_201',
        roomId: 'room_rad_1',
        roomName: 'Imaging Suite B & Sub-Corridor',
        name: 'Sanitary Riser Backflow Partition',
        assemblyType: 'Drywall',
        currentMcPercent: 48.5,
        dryGoalPercent: 12.0,
        status: 'DemoRequired',
        salvageable: false,
        notes: 'CAT 3 sewage backup + S520 Condition 3 fungal colonization; full negative air containment required.',
      },
    ],
    readings: [
      {
        id: 'rd_201',
        projectId: 'proj_austin_8842',
        roomId: 'room_rad_1',
        roomName: 'Imaging Suite B & Sub-Corridor',
        timestamp: '2026-11-09T18:50:00.000Z',
        tempF: 78.1,
        rhPercent: 68.4,
        gpp: 98.2,
        dewPointF: 66.8,
        vaporPressureInHg: 0.66,
        mcPercent: 48.5,
        technician: 'Alex Merrill, WRT/ASD',
      },
    ],
    equipment: [],
    checklist: generateAdaptiveChecklist('CAT_3', 'CLASS_3'),
    scopeItems: [
      {
        id: 'scp_201',
        xactCode: 'HMR BARR',
        category: 'Containment',
        description: 'Containment barrier - 6-mil polyethylene film with ZipWall poles & negative air port',
        quantity: 420,
        unit: 'SF',
        unitPrice: 1.45,
        total: 609.0,
        roomName: 'Imaging Suite B & Sub-Corridor',
        iicrcJustification: 'ANSI/IICRC S520 §12.1 — Condition 3 mold & CAT 3 biohazard isolation.',
      },
    ],
    authorizations: [],
  },
  {
    id: 'proj_austin_8843',
    lossNumber: 'LOSS-2026-8843',
    companyId: 'comp_obsidian_01',
    ownerId: 'tech_merrill_01',
    clientName: 'Domain Northside Penthouse — Unit 19B',
    clientPhone: '(512) 555-0349',
    clientEmail: 'concierge@domainpenthouse.com',
    insuranceCarrier: 'PURE High Net Worth',
    claimNumber: 'PURE-33104-TX',
    adjusterName: 'David Thorne',
    lossAddress: '11800 Domain Blvd, Austin, TX 78758, USA',
    latitude: 30.4021,
    longitude: -97.7259,
    granularity: 'ROOFTOP',
    waterCategory: 'CAT_1',
    lossClass: 'CLASS_4',
    moldCondition: 'NONE',
    stage: 'Intake',
    slaPriority: 'Urgent 2h',
    createdAt: '2026-11-09T19:10:00.000Z',
    updatedAt: '2026-11-09T19:10:00.000Z',
    syncState: 'Synced',
    rooms: [
      {
        id: 'room_pent_1',
        name: 'Custom Herringbone Gallery & Wine Room',
        lengthFt: 26,
        widthFt: 18,
        heightFt: 10,
        areaSqFt: 468,
        volumeCuFt: 4680,
        flooringMaterial: '3/4" Solid European White Oak over sleepers',
        wallMaterial: 'Venetian Plaster over 5/8" Drywall',
        trimMaterial: 'Custom Rift-Cut Oak Base',
        wetAreaSqFt: 240,
        svgRect: { x: 12, y: 14, width: 76, height: 70 },
      },
    ],
    pins: [],
    materials: [
      {
        id: 'mat_301',
        roomId: 'room_pent_1',
        roomName: 'Custom Herringbone Gallery & Wine Room',
        name: '3/4" Solid European White Oak Subfloor Cavity',
        assemblyType: 'Hardwood',
        currentMcPercent: 22.8,
        dryGoalPercent: 9.5,
        status: 'Wet',
        salvageable: true,
        notes: 'Class 4 bound water in sleeper cavity; requires Injectidry negative pressure floor mat system.',
      },
    ],
    readings: [],
    equipment: [],
    checklist: generateAdaptiveChecklist('CAT_1', 'CLASS_4'),
    scopeItems: [],
    authorizations: [],
  },
];

const INITIAL_FIELD_UNITS: FieldUnit[] = [
  {
    id: 'unit_alpha_01',
    companyId: 'comp_obsidian_01',
    ownerId: 'tech_merrill_01',
    callsign: 'STRIKE-ALPHA-01',
    leadTech: 'Alex Merrill, MWR / CMR',
    certifications: ['IICRC WRT', 'IICRC ASD', 'IICRC AMRT', 'OSHA 30'],
    vehicle: 'Mercedes Sprinter 3500XD Pro-Mount',
    status: 'OnSite',
    activeProjectId: 'proj_austin_8841',
    directive: 'S500 §12.1 Critical Containment + LGR Grain Depression & 24" Flood Cut',
    slaPriority: 'Emergency 60m',
    latitude: 30.2686,
    longitude: -97.7426,
    syncState: 'Synced',
    updatedAt: '2026-11-09T18:15:00.000Z',
  },
  {
    id: 'unit_bravo_02',
    companyId: 'comp_obsidian_01',
    ownerId: 'tech_merrill_01',
    callsign: 'RECON-BRAVO-02',
    leadTech: 'Marcus Thorne, WRT / ASD',
    certifications: ['IICRC WRT', 'IICRC ASD', 'IICRC OCT'],
    vehicle: 'Ford Transit 350 HD Desiccant Rig',
    status: 'Available',
    activeProjectId: '',
    directive: 'Standby at Central Austin Depot — Ready for CAT 3 / Class 3-4 Deployment',
    slaPriority: 'None',
    latitude: 30.2745,
    longitude: -97.7401,
    syncState: 'Synced',
    updatedAt: '2026-11-09T18:45:00.000Z',
  },
  {
    id: 'unit_charlie_03',
    companyId: 'comp_obsidian_01',
    ownerId: 'tech_merrill_01',
    callsign: 'ABATE-CHARLIE-03',
    leadTech: 'Elena Rostova, AMRT / CIEC',
    certifications: ['IICRC AMRT', 'IICRC WRT', 'EPA Lead RRP'],
    vehicle: 'RAM ProMaster 3500 Negative-Air Fleet',
    status: 'Available',
    activeProjectId: '',
    directive: 'HEPA AFD & Containment Abatement Ready',
    slaPriority: 'None',
    latitude: 30.2912,
    longitude: -97.7384,
    syncState: 'Synced',
    updatedAt: '2026-11-09T19:00:00.000Z',
  },
];

export type ActiveNavTab =
  | 'dashboard'
  | 'intake'
  | 'dispatch'
  | 'equipment'
  | 'floorplan'
  | 'checklist'
  | 'documentation'
  | 'ai-assistant'
  | 'admin';

interface AppContextValue {
  currentUser: AppUser;
  switchRole: (role: Role) => void;
  hasPermission: (perm: Permission) => boolean;
  signInWithGoogle: () => Promise<void>;
  projects: Project[];
  activeProjectId: string;
  activeProject: Project;
  setActiveProjectId: (id: string) => void;
  activeNav: ActiveNavTab;
  setActiveNav: (tab: ActiveNavTab) => void;
  commandCenterOpen: boolean;
  setCommandCenterOpen: (open: boolean) => void;
  mapsApiKey: string;
  gmpQuotaExceeded: boolean;
  createProject: (input: {
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    insuranceCarrier: string;
    claimNumber: string;
    adjusterName: string;
    lossAddress: string;
    latitude: number;
    longitude: number;
    granularity: GeocodingGranularity;
    placeId?: string;
    waterCategory: WaterCategory;
    lossClass: LossClass;
    initialRoomName?: string;
    initialAreaSqFt?: number;
  }) => Promise<Project>;
  updateProjectStage: (
    projectId: string,
    stage: ProjectStage,
    waterCategory?: WaterCategory,
    lossClass?: LossClass
  ) => Promise<void>;
  addReading: (
    projectId: string,
    input: {
      roomId: string;
      roomName: string;
      tempF: number;
      rhPercent: number;
      mcPercent: number;
    }
  ) => Promise<void>;
  dropMoisturePin: (
    projectId: string,
    input: {
      roomId: string;
      roomName: string;
      x: number;
      y: number;
      materialName: string;
      substrate: string;
      mcPercent: number;
      dryGoalPercent: number;
    }
  ) => Promise<MoistureMapPin>;
  markPinAsDry: (projectId: string, pinId: string) => Promise<void>;
  removeMoisturePin: (projectId: string, pinId: string) => Promise<void>;
  addRoomFromVisionOrScan: (
    projectId: string,
    roomInput: {
      name: string;
      lengthFt: number;
      widthFt: number;
      heightFt: number;
      flooringMaterial: string;
      wallMaterial: string;
      trimMaterial: string;
      wetAreaSqFt: number;
    }
  ) => Promise<void>;
  resetFloorplanRooms: (projectId: string) => Promise<void>;
  deployEquipmentBatch: (
    projectId: string,
    items: Omit<PlacedEquipment, 'id' | 'projectId' | 'updatedAt'>[]
  ) => Promise<void>;
  updateEquipmentRuntime: (
    projectId: string,
    equipmentId: string,
    runtimeHours: number,
    status: PlacedEquipment['status']
  ) => Promise<void>;
  toggleChecklistTask: (projectId: string, taskId: string) => Promise<void>;
  addScopeLineItem: (
    projectId: string,
    item: Omit<ScopeLineItem, 'id' | 'total'>
  ) => Promise<void>;
  addSignedAuthorization: (
    projectId: string,
    authItem: Omit<SignedAuthorization, 'id' | 'projectId'>
  ) => Promise<void>;
  saveAiReport: (projectId: string, reportMarkdown: string) => Promise<void>;
  fieldUnits: FieldUnit[];
  registerFieldUnit: (input: {
    callsign: string;
    leadTech: string;
    vehicle: string;
    certifications: string[];
  }) => Promise<void>;
  dispatchFieldUnit: (params: {
    unitId: string;
    projectId: string;
    slaPriority: 'Emergency 60m' | 'Urgent 2h' | 'Standard 4h';
    directive: string;
  }) => Promise<void>;
  updateFieldUnitStatus: (unitId: string, status: FieldUnit['status']) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser>({
    uid: 'tech_merrill_01',
    displayName: 'Alex Merrill, MWR / CMR',
    email: 'merrillalex500@gmail.com',
    companyId: 'comp_obsidian_01',
    companyName: 'Obsidian Restoration & Mitigation Group',
    role: 'SuperAdmin',
    permissions: ROLE_PERMISSIONS.SuperAdmin,
  });

  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>(INITIAL_PROJECTS[0].id);
  const [activeNav, setActiveNav] = useState<ActiveNavTab>('dashboard');
  const [commandCenterOpen, setCommandCenterOpen] = useState<boolean>(false);
  const [fieldUnits, setFieldUnits] = useState<FieldUnit[]>(INITIAL_FIELD_UNITS);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || ''
  );
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);

  // Listen for Google Maps Platform quota events (Section 8 Case A Demo Key Defense)
  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Load Maps API key from server config endpoint if not set in client env
  useEffect(() => {
    fetch('/api/maps/config')
      .then((r) => r.json())
      .then((data) => {
        if (data?.apiKey) {
          setMapsApiKey(data.apiKey);
        }
      })
      .catch(() => {
        // Fallback silently if offline
      });
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for CLI CommandCenter
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandCenterOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Sync Firebase Auth state when user logs in with Google
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setCurrentUser((prev) => ({
          ...prev,
          uid: fbUser.uid,
          displayName: fbUser.displayName || prev.displayName,
          email: fbUser.email || prev.email,
        }));
      }
    });
    return () => unsub();
  }, []);

  // Hydrate initial projects into IndexedDB on mount
  useEffect(() => {
    for (const proj of INITIAL_PROJECTS) {
      void indexedDbStorage.saveProjectDossierOffline(proj);
    }
  }, []);

  const switchRole = useCallback((role: Role) => {
    setCurrentUser((prev) => ({
      ...prev,
      role,
      permissions: ROLE_PERMISSIONS[role],
    }));
    eventBus.publish({
      source: 'RBAC',
      type: 'rbac.role_switched',
      severity: 'nominal',
      title: `RBAC Context Switched: ${role}`,
      message: `Active permissions updated (${ROLE_PERMISSIONS[role].length} capabilities enabled).`,
    });
  }, []);

  const hasPermission = useCallback(
    (perm: Permission) => currentUser.permissions.includes(perm),
    [currentUser.permissions]
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      eventBus.publish({
        source: 'Auth',
        type: 'auth.signed_in',
        severity: 'nominal',
        title: 'Firebase Auth Verified',
        message: 'Authenticated session connected to Firestore Enterprise.',
      });
    } catch (err) {
      eventBus.publish({
        source: 'Auth',
        type: 'auth.warning',
        severity: 'warning',
        title: 'Local Technician Session Active',
        message: err instanceof Error ? err.message : 'Continuing with offline-first technician session.',
      });
    }
  }, []);

  const tenantProjects = useMemo(
    () => projects.filter((p) => p.companyId === currentUser.companyId),
    [projects, currentUser.companyId]
  );

  const activeProject = useMemo(
    () => tenantProjects.find((p) => p.id === activeProjectId) || tenantProjects[0],
    [tenantProjects, activeProjectId]
  );

  const createProject: AppContextValue['createProject'] = useCallback(
    async (input) => {
      const id = `proj_${Date.now()}`;
      const lossNum = `LOSS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const area = Math.max(100, input.initialAreaSqFt || 480);
      const lengthFt = Math.round(Math.sqrt(area * 1.25));
      const widthFt = Math.round(area / lengthFt);
      const nowIso = new Date().toISOString();

      let resolvedAddress = input.lossAddress.trim();
      let resolvedGranularity = input.granularity;
      let resolvedPlaceId = input.placeId;

      if (!resolvedAddress && Number.isFinite(input.latitude) && Number.isFinite(input.longitude)) {
        try {
          const geoResp = await fetch('/api/maps/reverse-geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: input.latitude, lng: input.longitude }),
          });
          if (geoResp.ok) {
            const geoData = await geoResp.json();
            resolvedAddress = geoData.formattedAddress || resolvedAddress;
            resolvedGranularity = geoData.granularity || resolvedGranularity;
            resolvedPlaceId = geoData.placeId || resolvedPlaceId;
          }
        } catch {
          // Quiet backend fallback
        }
      }

      const newProj: Project = {
        id,
        lossNumber: lossNum,
        companyId: currentUser.companyId,
        ownerId: currentUser.uid,
        clientName: input.clientName.trim(),
        clientPhone: input.clientPhone.trim() || '(512) 555-0100',
        clientEmail: input.clientEmail.trim() || 'client@property.com',
        insuranceCarrier: input.insuranceCarrier.trim() || 'Commercial Carrier',
        claimNumber: input.claimNumber.trim() || `CLM-${Date.now().toString().slice(-6)}`,
        adjusterName: input.adjusterName.trim() || 'Field Adjuster',
        lossAddress: resolvedAddress || '100 Congress Ave, Austin, TX 78701, USA',
        latitude: input.latitude,
        longitude: input.longitude,
        granularity: resolvedGranularity,
        placeId: resolvedPlaceId,
        waterCategory: input.waterCategory,
        lossClass: input.lossClass,
        moldCondition: input.waterCategory === 'CAT_3' ? 'CONDITION_3' : 'CONDITION_1',
        stage: 'Inspection',
        slaPriority: input.waterCategory === 'CAT_3' ? 'Emergency 60m' : 'Urgent 2h',
        createdAt: nowIso,
        updatedAt: nowIso,
        syncState: syncService.effectiveOnline ? 'Synced' : 'Queued in IDB',
        rooms: [
          {
            id: `room_${Date.now()}`,
            name: input.initialRoomName?.trim() || 'Primary Affected Chamber',
            lengthFt,
            widthFt,
            heightFt: 10,
            areaSqFt: area,
            volumeCuFt: area * 10,
            flooringMaterial: 'Engineered Hardwood / Concrete Slab',
            wallMaterial: '5/8" Gypsum Drywall',
            trimMaterial: '4" Wood Baseboard',
            wetAreaSqFt: Math.round(area * 0.75),
            svgRect: { x: 10, y: 12, width: 80, height: 74 },
          },
        ],
        pins: [],
        materials: [],
        readings: [],
        equipment: [],
        checklist: generateAdaptiveChecklist(input.waterCategory, input.lossClass),
        scopeItems: [],
        authorizations: [],
      };

      setProjects((prev) => [newProj, ...prev]);
      setActiveProjectId(newProj.id);
      await indexedDbStorage.saveProjectDossierOffline(newProj);
      await syncService.queueOrSyncMutation({
        entityType: 'project',
        entityId: newProj.id,
        projectId: newProj.id,
        action: 'create',
        payload: {
          id: newProj.id,
          companyId: newProj.companyId,
          clientName: newProj.clientName,
          lossAddress: newProj.lossAddress,
          latitude: newProj.latitude,
          longitude: newProj.longitude,
          granularity: newProj.granularity,
          waterCategory: newProj.waterCategory,
          lossClass: newProj.lossClass,
          stage: newProj.stage,
        },
      });

      eventBus.publish({
        source: 'Intake',
        type: 'project.created',
        severity: input.waterCategory === 'CAT_3' ? 'hazard' : 'nominal',
        title: `Loss File Opened: ${newProj.lossNumber}`,
        message: `${newProj.clientName} (${newProj.waterCategory} / ${newProj.lossClass}) geocoded at ${newProj.lossAddress}.`,
      });

      return newProj;
    },
    [currentUser.companyId, currentUser.uid]
  );

  const updateProjectStage: AppContextValue['updateProjectStage'] = useCallback(
    async (projectId, stage, waterCategory, lossClass) => {
      let updatedProj: Project | null = null;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const nextCat = waterCategory || p.waterCategory;
          const nextClass = lossClass || p.lossClass;
          updatedProj = {
            ...p,
            stage,
            waterCategory: nextCat,
            lossClass: nextClass,
            checklist: generateAdaptiveChecklist(nextCat, nextClass, p.checklist),
            updatedAt: new Date().toISOString(),
          };
          return updatedProj;
        })
      );

      if (updatedProj) {
        await indexedDbStorage.saveProjectDossierOffline(updatedProj);
        await syncService.queueOrSyncMutation({
          entityType: 'project',
          entityId: projectId,
          projectId,
          action: 'update',
          payload: {
            id: projectId,
            companyId: (updatedProj as Project).companyId,
            clientName: (updatedProj as Project).clientName,
            lossAddress: (updatedProj as Project).lossAddress,
            latitude: (updatedProj as Project).latitude,
            longitude: (updatedProj as Project).longitude,
            granularity: (updatedProj as Project).granularity,
            stage,
            waterCategory: (updatedProj as Project).waterCategory,
            lossClass: (updatedProj as Project).lossClass,
          },
        });
        eventBus.publish({
          source: 'Workflow',
          type: 'project.stage_updated',
          severity: 'nominal',
          title: `Workflow Advanced: ${stage}`,
          message: `Adaptive 7-Phase S500/S520 checklist synchronized for ${(updatedProj as Project).waterCategory} / ${(updatedProj as Project).lossClass}.`,
        });
      }
    },
    []
  );

  const addReading: AppContextValue['addReading'] = useCallback(
    async (projectId, input) => {
      const gpp = calculateGPP(input.tempF, input.rhPercent);
      const dewPointF = calculateDewPointF(input.tempF, input.rhPercent);
      const vaporPressureInHg = calculateVaporPressureInHg(input.tempF, input.rhPercent);
      const reading: Reading = {
        id: `rd_${Date.now()}`,
        projectId,
        roomId: input.roomId,
        roomName: input.roomName,
        timestamp: new Date().toISOString(),
        tempF: input.tempF,
        rhPercent: input.rhPercent,
        gpp,
        dewPointF,
        vaporPressureInHg,
        mcPercent: input.mcPercent,
        technician: currentUser.displayName,
      };

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                readings: [...p.readings, reading],
                updatedAt: reading.timestamp,
              }
            : p
        )
      );

      await indexedDbStorage.saveReadingOffline(reading);
      await syncService.queueOrSyncMutation({
        entityType: 'reading',
        entityId: reading.id,
        projectId,
        action: 'create',
        payload: {
          roomName: reading.roomName,
          tempF: reading.tempF,
          rhPercent: reading.rhPercent,
          gpp: reading.gpp,
          mcPercent: reading.mcPercent,
        },
      });

      eventBus.publish({
        source: 'Psychrometrics',
        type: 'reading.logged',
        severity: reading.mcPercent > 25 ? 'warning' : 'nominal',
        title: `Psychrometric Telemetry Logged (${reading.gpp} GPP)`,
        message: `${reading.roomName}: ${reading.tempF}°F · ${reading.rhPercent}% RH · ${reading.mcPercent}% MC`,
      });
    },
    [currentUser.displayName]
  );

  const dropMoisturePin: AppContextValue['dropMoisturePin'] = useCallback(
    async (projectId, input) => {
      const nowIso = new Date().toISOString();
      const status =
        input.mcPercent <= input.dryGoalPercent
          ? 'dry'
          : input.mcPercent <= input.dryGoalPercent + 10
          ? 'drying'
          : 'wet';

      const materialId = `mat_${Date.now()}`;
      const newPin: MoistureMapPin = {
        id: `pin_${Date.now()}`,
        number: 1,
        roomId: input.roomId,
        roomName: input.roomName,
        x: Math.max(0.05, Math.min(0.95, input.x)),
        y: Math.max(0.05, Math.min(0.95, input.y)),
        materialId,
        materialName: input.materialName,
        substrate: input.substrate,
        mcPercent: input.mcPercent,
        dryGoalPercent: input.dryGoalPercent,
        status,
        updatedAt: nowIso,
        history: [
          {
            id: `h_${Date.now()}`,
            mcPercent: input.mcPercent,
            tempF: 74.0,
            rhPercent: 45.0,
            gpp: calculateGPP(74.0, 45.0),
            recordedAt: nowIso,
            technician: currentUser.displayName,
          },
        ],
      };

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const nextNum = p.pins.reduce((max, pin) => Math.max(max, pin.number), 0) + 1;
          newPin.number = nextNum;
          const newMat = {
            id: materialId,
            roomId: input.roomId,
            roomName: input.roomName,
            name: input.materialName,
            assemblyType: 'Drywall' as const,
            currentMcPercent: input.mcPercent,
            dryGoalPercent: input.dryGoalPercent,
            status:
              status === 'dry'
                ? ('Dry' as const)
                : status === 'drying'
                ? ('Drying' as const)
                : ('Wet' as const),
            salvageable: input.mcPercent < 40,
            notes: `Pin #${nextNum} (${input.substrate})`,
          };
          return {
            ...p,
            pins: [...p.pins, newPin],
            materials: [...p.materials, newMat],
            updatedAt: nowIso,
          };
        })
      );

      await syncService.queueOrSyncMutation({
        entityType: 'pin',
        entityId: newPin.id,
        projectId,
        action: 'create',
        payload: {
          pinNumber: newPin.number,
          mcPercent: newPin.mcPercent,
          status: newPin.status,
        },
      });

      eventBus.publish({
        source: 'FloorplanViewer',
        type: 'pin.dropped',
        severity: status === 'wet' ? 'warning' : 'nominal',
        title: `Moisture Pin #${newPin.number} Placed`,
        message: `${newPin.materialName} logged at ${newPin.mcPercent}% MC (Dry Goal: ${newPin.dryGoalPercent}% MC).`,
      });

      return newPin;
    },
    [currentUser.displayName]
  );

  const markPinAsDry: AppContextValue['markPinAsDry'] = useCallback(
    async (projectId, pinId) => {
      const nowIso = new Date().toISOString();
      let targetPinLabel = '';
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          let targetMaterialId = '';
          let targetDryGoal = 12.0;
          const updatedPins = p.pins.map((pin) => {
            if (pin.id !== pinId) return pin;
            targetMaterialId = pin.materialId;
            targetDryGoal = pin.dryGoalPercent;
            targetPinLabel = `Pin #${pin.number} (${pin.materialName})`;
            return {
              ...pin,
              status: 'dry' as const,
              mcPercent: pin.dryGoalPercent,
              updatedAt: nowIso,
              history: [
                ...pin.history,
                {
                  id: `h_${Date.now()}`,
                  mcPercent: pin.dryGoalPercent,
                  tempF: 72.5,
                  rhPercent: 38.0,
                  gpp: calculateGPP(72.5, 38.0),
                  recordedAt: nowIso,
                  technician: currentUser.displayName,
                },
              ],
            };
          });

          const updatedMaterials = p.materials.map((m) =>
            m.id === targetMaterialId
              ? {
                  ...m,
                  currentMcPercent: targetDryGoal,
                  status: 'Dry' as const,
                  notes: 'Verified Dry Standard achieved via 2D Floorplan Pin inspection',
                }
              : m
          );

          return {
            ...p,
            pins: updatedPins,
            materials: updatedMaterials,
            updatedAt: nowIso,
          };
        })
      );

      await syncService.queueOrSyncMutation({
        entityType: 'pin',
        entityId: pinId,
        projectId,
        action: 'update',
        payload: { status: 'dry' },
      });

      eventBus.publish({
        source: 'FloorplanViewer',
        type: 'pin.marked_dry',
        severity: 'nominal',
        title: 'Dry Standard Verified',
        message: `${targetPinLabel || 'Moisture Pin'} marked as Dry and linked TrackedMaterial updated to Dry Goal.`,
      });
    },
    [currentUser.displayName]
  );

  const removeMoisturePin: AppContextValue['removeMoisturePin'] = useCallback(
    async (projectId, pinId) => {
      let removedPinNum = 0;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const target = p.pins.find((pin) => pin.id === pinId);
          if (target) removedPinNum = target.number;
          return {
            ...p,
            pins: p.pins.filter((pin) => pin.id !== pinId),
            materials: target
              ? p.materials.filter((m) => m.id !== target.materialId)
              : p.materials,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      await syncService.queueOrSyncMutation({
        entityType: 'pin',
        entityId: pinId,
        projectId,
        action: 'delete',
        payload: { pinId },
      });

      eventBus.publish({
        source: 'FloorplanViewer',
        type: 'pin.removed',
        severity: 'nominal',
        title: `Moisture Pin #${removedPinNum || ''} Removed`,
        message: 'Floorplan telemetry pin deleted and queued for cloud sync.',
      });
    },
    []
  );

  const addRoomFromVisionOrScan: AppContextValue['addRoomFromVisionOrScan'] = useCallback(
    async (projectId, roomInput) => {
      const areaSqFt = Math.round(roomInput.lengthFt * roomInput.widthFt);
      const volumeCuFt = Math.round(areaSqFt * roomInput.heightFt);
      const newRoom: Room = {
        id: `room_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        name: roomInput.name,
        lengthFt: roomInput.lengthFt,
        widthFt: roomInput.widthFt,
        heightFt: roomInput.heightFt,
        areaSqFt,
        volumeCuFt,
        flooringMaterial: roomInput.flooringMaterial,
        wallMaterial: roomInput.wallMaterial,
        trimMaterial: roomInput.trimMaterial,
        wetAreaSqFt: roomInput.wetAreaSqFt,
        svgRect: {
          x: 12 + Math.floor(Math.random() * 25),
          y: 14 + Math.floor(Math.random() * 25),
          width: 48,
          height: 42,
        },
      };

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                rooms: [...p.rooms, newRoom],
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );

      eventBus.publish({
        source: 'VisionScanner',
        type: 'floorplan.room_added',
        severity: 'nominal',
        title: `2D Chamber Synthesized: ${newRoom.name}`,
        message: `${newRoom.lengthFt}' × ${newRoom.widthFt}' (${newRoom.areaSqFt} SF) mapped to SVG floorplan.`,
      });
    },
    []
  );

  const resetFloorplanRooms: AppContextValue['resetFloorplanRooms'] = useCallback(
    async (projectId) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                rooms: p.rooms.slice(0, 1),
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );
      eventBus.publish({
        source: 'ARScanner',
        type: 'floorplan.reset',
        severity: 'warning',
        title: 'AR Scan Session Reset',
        message: 'Discarded temporary LiDAR room mesh and restored primary baseline chamber.',
      });
    },
    []
  );

  const deployEquipmentBatch: AppContextValue['deployEquipmentBatch'] = useCallback(
    async (projectId, items) => {
      const nowIso = new Date().toISOString();
      const created: PlacedEquipment[] = items.map((item, idx) => ({
        ...item,
        id: `eq_${Date.now()}_${idx}`,
        projectId,
        syncState: syncService.effectiveOnline ? 'Synced' : 'Queued in IDB',
        updatedAt: nowIso,
      }));

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                equipment: [...p.equipment, ...created],
                updatedAt: nowIso,
              }
            : p
        )
      );

      for (const eq of created) {
        await indexedDbStorage.saveEquipmentLogOffline(eq);
        await syncService.queueOrSyncMutation({
          entityType: 'equipment',
          entityId: eq.id,
          projectId,
          action: 'create',
          payload: {
            type: eq.type,
            serialNumber: eq.serialNumber,
            roomName: eq.roomName,
            ampDraw: eq.ampDraw,
            dailyRate: eq.dailyRate,
            runtimeHours: eq.runtimeHours,
            status: eq.status,
          },
        });
      }

      eventBus.publish({
        source: 'EquipmentManager',
        type: 'equipment.deployed',
        severity: 'nominal',
        title: `Deployed ${created.length} S500 Fleet Asset(s)`,
        message: `Equipment logged to ${projectId} and synchronized with 15A circuit load calculator.`,
      });
    },
    []
  );

  const updateEquipmentRuntime: AppContextValue['updateEquipmentRuntime'] = useCallback(
    async (projectId, equipmentId, runtimeHours, status) => {
      const nowIso = new Date().toISOString();
      let updatedItem: PlacedEquipment | null = null;

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            equipment: p.equipment.map((eq) => {
              if (eq.id !== equipmentId) return eq;
              updatedItem = {
                ...eq,
                runtimeHours: Math.max(0, runtimeHours),
                status,
                updatedAt: nowIso,
              };
              return updatedItem;
            }),
            updatedAt: nowIso,
          };
        })
      );

      if (updatedItem) {
        await indexedDbStorage.saveEquipmentLogOffline(updatedItem);
        await syncService.queueOrSyncMutation({
          entityType: 'equipment',
          entityId: equipmentId,
          projectId,
          action: 'update',
          payload: {
            type: (updatedItem as PlacedEquipment).type,
            serialNumber: (updatedItem as PlacedEquipment).serialNumber,
            roomName: (updatedItem as PlacedEquipment).roomName,
            ampDraw: (updatedItem as PlacedEquipment).ampDraw,
            dailyRate: (updatedItem as PlacedEquipment).dailyRate,
            runtimeHours,
            status,
          },
        });
      }
    },
    []
  );

  const toggleChecklistTask: AppContextValue['toggleChecklistTask'] = useCallback(
    async (projectId, taskId) => {
      const nowIso = new Date().toISOString();
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const nextChecklist: ChecklistTask[] = p.checklist.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  completed: !t.completed,
                  completedAt: !t.completed ? nowIso : undefined,
                  completedBy: !t.completed ? currentUser.displayName : undefined,
                }
              : t
          );
          return {
            ...p,
            checklist: nextChecklist,
            updatedAt: nowIso,
          };
        })
      );
    },
    [currentUser.displayName]
  );

  const addScopeLineItem: AppContextValue['addScopeLineItem'] = useCallback(
    async (projectId, item) => {
      const total = Math.round(item.quantity * item.unitPrice * 100) / 100;
      const newLine: ScopeLineItem = {
        ...item,
        id: `scp_${Date.now()}`,
        total,
      };
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                scopeItems: [...p.scopeItems, newLine],
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );
    },
    []
  );

  const addSignedAuthorization: AppContextValue['addSignedAuthorization'] = useCallback(
    async (projectId, authItem) => {
      const newAuth: SignedAuthorization = {
        ...authItem,
        id: `auth_${Date.now()}`,
        projectId,
      };
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                authorizations: [...p.authorizations, newAuth],
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );

      eventBus.publish({
        source: 'SignaturePad',
        type: 'authorization.signed',
        severity: 'nominal',
        title: 'Cryptographic Authorization Bound',
        message: `${newAuth.signerName} (${newAuth.signerRole}) signed ${newAuth.authorizationType}. SHA-256: ${newAuth.verificationHash.slice(0, 12)}…`,
      });
    },
    []
  );

  const saveAiReport: AppContextValue['saveAiReport'] = useCallback(
    async (projectId, reportMarkdown) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                aiSummaryReport: reportMarkdown,
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );
    },
    []
  );

  const registerFieldUnit: AppContextValue['registerFieldUnit'] = useCallback(
    async (input) => {
      const nowIso = new Date().toISOString();
      const newUnit: FieldUnit = {
        id: `unit_${Date.now()}`,
        companyId: currentUser.companyId,
        ownerId: currentUser.uid,
        callsign: input.callsign.trim().toUpperCase(),
        leadTech: input.leadTech.trim(),
        vehicle: input.vehicle.trim(),
        certifications: input.certifications,
        status: 'Available',
        activeProjectId: '',
        directive: 'Registered & Ready for Dispatch',
        slaPriority: 'None',
        latitude: 30.27 + (Math.random() - 0.5) * 0.04,
        longitude: -97.74 + (Math.random() - 0.5) * 0.04,
        syncState: syncService.effectiveOnline ? 'Synced' : 'Queued in IDB',
        updatedAt: nowIso,
      };

      setFieldUnits((prev) => [newUnit, ...prev]);
      await syncService.queueOrSyncMutation({
        entityType: 'dispatch',
        entityId: newUnit.id,
        projectId: '',
        action: 'create',
        payload: {
          companyId: newUnit.companyId,
          callsign: newUnit.callsign,
          leadTech: newUnit.leadTech,
          vehicle: newUnit.vehicle,
          status: newUnit.status,
          activeProjectId: '',
          directive: newUnit.directive,
          slaPriority: newUnit.slaPriority,
        },
      });

      eventBus.publish({
        source: 'CrewDispatch',
        type: 'unit.registered',
        severity: 'nominal',
        title: `Field Unit Registered: ${newUnit.callsign}`,
        message: `${newUnit.leadTech} (${newUnit.vehicle}) added to active roster.`,
      });
    },
    [currentUser.companyId, currentUser.uid]
  );

  const dispatchFieldUnit: AppContextValue['dispatchFieldUnit'] = useCallback(
    async ({ unitId, projectId, slaPriority, directive }) => {
      const nowIso = new Date().toISOString();
      let unitCallsign = '';
      let targetLossNumber = '';

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          targetLossNumber = p.lossNumber;
          return {
            ...p,
            assignedUnitId: unitId,
            slaPriority,
            dispatchDirective: directive,
            stage: p.stage === 'Intake' ? 'Inspection' : p.stage,
            updatedAt: nowIso,
          };
        })
      );

      setFieldUnits((prev) =>
        prev.map((u) => {
          if (u.id !== unitId) return u;
          unitCallsign = u.callsign;
          return {
            ...u,
            status: 'Dispatched',
            activeProjectId: projectId,
            slaPriority,
            directive,
            syncState: syncService.effectiveOnline ? 'Synced' : 'Queued in IDB',
            updatedAt: nowIso,
          };
        })
      );

      await syncService.queueOrSyncMutation({
        entityType: 'dispatch',
        entityId: unitId,
        projectId,
        action: 'update',
        payload: {
          companyId: currentUser.companyId,
          callsign: unitCallsign || unitId,
          leadTech: 'Assigned Lead',
          vehicle: 'Response Rig',
          status: 'Dispatched',
          activeProjectId: projectId,
          directive,
          slaPriority,
        },
      });

      eventBus.publish({
        source: 'CrewDispatch',
        type: 'unit.dispatched',
        severity: slaPriority === 'Emergency 60m' ? 'hazard' : 'nominal',
        title: `DISPATCHED: ${unitCallsign || unitId} → ${targetLossNumber || projectId}`,
        message: `SLA: ${slaPriority} · Directive: ${directive}`,
      });
    },
    [currentUser.companyId]
  );

  const updateFieldUnitStatus: AppContextValue['updateFieldUnitStatus'] = useCallback(
    async (unitId, status) => {
      const nowIso = new Date().toISOString();
      let callsign = '';
      setFieldUnits((prev) =>
        prev.map((u) => {
          if (u.id !== unitId) return u;
          callsign = u.callsign;
          return {
            ...u,
            status,
            activeProjectId: status === 'Available' || status === 'StandDown' ? '' : u.activeProjectId,
            slaPriority: status === 'Available' || status === 'StandDown' ? 'None' : u.slaPriority,
            updatedAt: nowIso,
          };
        })
      );

      await syncService.queueOrSyncMutation({
        entityType: 'dispatch',
        entityId: unitId,
        projectId: '',
        action: 'update',
        payload: {
          companyId: currentUser.companyId,
          callsign: callsign || unitId,
          leadTech: 'Tech',
          vehicle: 'Rig',
          status,
          activeProjectId: '',
          directive: `Status updated to ${status}`,
          slaPriority: 'None',
        },
      });

      eventBus.publish({
        source: 'CrewDispatch',
        type: 'unit.status_changed',
        severity: status === 'StandDown' ? 'warning' : 'nominal',
        title: `Unit ${callsign} → ${status}`,
        message: `Field unit status synchronized with dispatch telemetry.`,
      });
    },
    [currentUser.companyId]
  );

  return (
    <AppContext.Provider
      value={{
        currentUser,
        switchRole,
        hasPermission,
        signInWithGoogle,
        projects: tenantProjects,
        activeProjectId,
        activeProject,
        setActiveProjectId,
        activeNav,
        setActiveNav,
        commandCenterOpen,
        setCommandCenterOpen,
        mapsApiKey,
        gmpQuotaExceeded,
        createProject,
        updateProjectStage,
        addReading,
        dropMoisturePin,
        markPinAsDry,
        removeMoisturePin,
        addRoomFromVisionOrScan,
        resetFloorplanRooms,
        deployEquipmentBatch,
        updateEquipmentRuntime,
        toggleChecklistTask,
        addScopeLineItem,
        addSignedAuthorization,
        saveAiReport,
        fieldUnits,
        registerFieldUnit,
        dispatchFieldUnit,
        updateFieldUnitStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
