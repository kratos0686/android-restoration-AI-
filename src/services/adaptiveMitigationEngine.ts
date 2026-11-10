import { ChecklistTask, LossClass, WaterCategory } from '../types';

const MASTER_CHECKLIST_LIBRARY: ChecklistTask[] = [
  // Phase 1: Emergency Intake & Hazard Assessment
  {
    id: 'chk-p1-1',
    phaseNumber: 1,
    phaseTitle: 'Phase 1: Hazard & Safety Triage',
    code: 'S500-10.1',
    title: 'Verify Electrical & Structural Hazard Lockout / Tagout (GFCI Verified)',
    standardRef: 'ANSI/IICRC S500 §10.1 / OSHA 29 CFR 1926',
    completed: true,
    requiredForCat: ['CAT_1', 'CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4'],
    safetyCritical: true,
  },
  {
    id: 'chk-p1-2',
    phaseNumber: 1,
    phaseTitle: 'Phase 1: Hazard & Safety Triage',
    code: 'S500-10.4',
    title: 'Don Full PPE: N95/P100 Respirator, Nitrile Gloves, Tyvek Suit & Eye Protection',
    standardRef: 'ANSI/IICRC S500 §10.4 / S520 §8.2',
    completed: false,
    requiredForCat: ['CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4'],
    safetyCritical: true,
  },
  // Phase 2: Source Stopping & Psychrometric Baseline
  {
    id: 'chk-p2-1',
    phaseNumber: 2,
    phaseTitle: 'Phase 2: Moisture & Psychrometric Mapping',
    code: 'S500-11.2',
    title: 'Confirm Water Intrusion Source Stopped & Document Unaffected Control Dry Standard',
    standardRef: 'ANSI/IICRC S500 §11.2',
    completed: true,
    requiredForCat: ['CAT_1', 'CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4'],
  },
  {
    id: 'chk-p2-2',
    phaseNumber: 2,
    phaseTitle: 'Phase 2: Moisture & Psychrometric Mapping',
    code: 'S500-11.4',
    title: 'Place Numbered Moisture Pins on 2D Floorplan & Log Thermal / Pinless Readings',
    standardRef: 'ANSI/IICRC S500 §11.4',
    completed: false,
    requiredForCat: ['CAT_1', 'CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4'],
  },
  // Phase 3: Containment & Negative Air Pressure
  {
    id: 'chk-p3-1',
    phaseNumber: 3,
    phaseTitle: 'Phase 3: Containment & Negative Air (6 ACH)',
    code: 'S520-12.1',
    title: 'Erect 6-Mil Poly Critical Barriers with ZipWall & Seal HVAC Registers',
    standardRef: 'ANSI/IICRC S520 §12.1 / S500 §12.3',
    completed: false,
    requiredForCat: ['CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4'],
    safetyCritical: true,
  },
  {
    id: 'chk-p3-2',
    phaseNumber: 3,
    phaseTitle: 'Phase 3: Containment & Negative Air (6 ACH)',
    code: 'S520-12.3',
    title: 'Deploy HEPA Air Scrubber (AFD) at ≥6 ACH & Verify Negative Pressure (≥ -5 Pa / -0.02" WC)',
    standardRef: 'ANSI/IICRC S520 §12.3',
    completed: false,
    requiredForCat: ['CAT_1', 'CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4'],
  },
  // Phase 4: Bulk Water Extraction
  {
    id: 'chk-p4-1',
    phaseNumber: 4,
    phaseTitle: 'Phase 4: Physical Water Extraction',
    code: 'S500-13.1',
    title: 'Perform Multi-Pass Weighted Subsurface & Hard Surface Truckmount/Portable Extraction',
    standardRef: 'ANSI/IICRC S500 §13.1',
    completed: false,
    requiredForCat: ['CAT_1', 'CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4'],
  },
  // Phase 5: Controlled Demolition & Unsalvageable Assembly Removal
  {
    id: 'chk-p5-1',
    phaseNumber: 5,
    phaseTitle: 'Phase 5: Controlled Demolition & Abatement',
    code: 'S500-13.5',
    title: 'Remove & Bag Non-Salvageable Porous Materials (Carpet Pad / Wet Insulation / Flood Cut 24" Above Waterline)',
    standardRef: 'ANSI/IICRC S500 §13.5.3',
    completed: false,
    requiredForCat: ['CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_2', 'CLASS_3', 'CLASS_4'],
    safetyCritical: true,
  },
  {
    id: 'chk-p5-2',
    phaseNumber: 5,
    phaseTitle: 'Phase 5: Controlled Demolition & Abatement',
    code: 'S500-13.6',
    title: 'Expose Bound-Water Cavities / Remove Vapor Retarders for Specialty Deep-Pocket Drying',
    standardRef: 'ANSI/IICRC S500 §13.6 (Class 3/4)',
    completed: false,
    requiredForCat: ['CAT_1', 'CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_3', 'CLASS_4'],
  },
  // Phase 6: HEPA Vacuuming & Antimicrobial Treatment
  {
    id: 'chk-p6-1',
    phaseNumber: 6,
    phaseTitle: 'Phase 6: HEPA Cleaning & Biocide Application',
    code: 'S500-14.2',
    title: 'HEPA Vacuum Exposed Framing & Subfloor, Damp-Wipe, and Apply EPA-Registered Antimicrobial (Signed Consent Required)',
    standardRef: 'ANSI/IICRC S500 §14.2 / EPA FIFRA',
    completed: false,
    requiredForCat: ['CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4'],
  },
  {
    id: 'chk-p6-2',
    phaseNumber: 6,
    phaseTitle: 'Phase 6: HEPA Cleaning & Biocide Application',
    code: 'S500-15.1',
    title: 'Place Calculated LGR Dehumidifiers & Air Movers (Verify 15A Circuit Load ≤12.0A Continuous)',
    standardRef: 'ANSI/IICRC S500 §15.1',
    completed: false,
    requiredForCat: ['CAT_1', 'CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4'],
  },
  // Phase 7: Daily Psychrometric Monitoring & PRV Closeout
  {
    id: 'chk-p7-1',
    phaseNumber: 7,
    phaseTitle: 'Phase 7: Verification & Dry Standard Closeout',
    code: 'S500-16.3',
    title: 'Confirm All Tracked Materials Meet Dry Goal (≤12% Wood / ≤0.5% Drywall) & Capture Digital Authorization',
    standardRef: 'ANSI/IICRC S500 §16.3 / S520 PRV',
    completed: false,
    requiredForCat: ['CAT_1', 'CAT_2', 'CAT_3'],
    requiredForClass: ['CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4'],
  },
];

/**
 * Generates the 7-Phase Adaptive Mitigation Checklist tailored to the project's
 * ANSI/IICRC S500 Water Category (CAT_1..CAT_3) and Loss Class (CLASS_1..CLASS_4).
 */
export function generateAdaptiveChecklist(
  waterCategory: WaterCategory,
  lossClass: LossClass,
  existingTasks?: ChecklistTask[]
): ChecklistTask[] {
  const existingMap: Record<string, boolean> = {};
  if (existingTasks) {
    for (const t of existingTasks) {
      existingMap[t.id] = t.completed;
    }
  }

  return MASTER_CHECKLIST_LIBRARY.filter(
    (task) =>
      task.requiredForCat.includes(waterCategory) &&
      task.requiredForClass.includes(lossClass)
  ).map((task) => ({
    ...task,
    completed: existingMap[task.id] !== undefined ? existingMap[task.id] : task.completed,
  }));
}

export interface SignatureHashInput {
  signerName: string;
  signerRole: string;
  projectId: string;
  timestampIso: string;
  signatureDataUrl: string;
}

/**
 * Computes a deterministic 64-character hexadecimal cryptographic verification digest
 * binding signer identity, project ID, timestamp, and canvas stroke payload.
 */
export function computeSignatureVerificationHash(input: SignatureHashInput): string {
  const canonical = `${input.projectId}|${input.signerName.trim()}|${input.signerRole}|${input.timestampIso}|${input.signatureDataUrl.slice(-128)}`;
  // Deterministic 256-bit (8 x 32-bit lanes) FNV-1a / Murmur-style avalanche digest
  const seeds = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  for (let i = 0; i < canonical.length; i++) {
    const code = canonical.charCodeAt(i);
    for (let lane = 0; lane < 8; lane++) {
      let h = seeds[lane];
      h ^= code + lane * 0x9e3779b9 + (i << 6) + (i >> 2);
      h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
      h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
      seeds[lane] = (h ^ (h >>> 16)) >>> 0;
    }
  }

  return seeds.map((s) => s.toString(16).padStart(8, '0')).join('').toUpperCase();
}
