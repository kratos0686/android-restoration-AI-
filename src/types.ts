export type Role = 'SuperAdmin' | 'CompanyAdmin' | 'Technician';

export type Permission =
  | 'manage_users'
  | 'view_billing'
  | 'manage_billing'
  | 'view_projects'
  | 'edit_projects'
  | 'view_admin'
  | 'use_ai_tools'
  | 'manage_company';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SuperAdmin: [
    'manage_users',
    'view_billing',
    'manage_billing',
    'view_projects',
    'edit_projects',
    'view_admin',
    'use_ai_tools',
    'manage_company',
  ],
  CompanyAdmin: [
    'manage_users',
    'view_billing',
    'view_projects',
    'edit_projects',
    'view_admin',
    'use_ai_tools',
    'manage_company',
  ],
  Technician: ['view_projects', 'edit_projects', 'use_ai_tools'],
};

export type WaterCategory = 'CAT_1' | 'CAT_2' | 'CAT_3';
export type LossClass = 'CLASS_1' | 'CLASS_2' | 'CLASS_3' | 'CLASS_4';
export type ProjectStage =
  | 'Intake'
  | 'Inspection'
  | 'Scope'
  | 'Stabilize'
  | 'Monitor'
  | 'Closeout';

export type GeocodingGranularity =
  | 'ROOFTOP'
  | 'RANGE_INTERPOLATED'
  | 'GEOMETRIC_CENTER'
  | 'APPROXIMATE';

export type PinStatus = 'wet' | 'drying' | 'dry' | 'stalled';

export interface MoisturePinHistoryEntry {
  id: string;
  mcPercent: number;
  tempF: number;
  rhPercent: number;
  gpp: number;
  recordedAt: string;
  technician: string;
}

export interface MoistureMapPin {
  id: string;
  number: number;
  roomId: string;
  roomName: string;
  /** Normalized 0..1 SVG X coordinate */
  x: number;
  /** Normalized 0..1 SVG Y coordinate */
  y: number;
  materialId: string;
  materialName: string;
  substrate: string;
  mcPercent: number;
  dryGoalPercent: number;
  status: PinStatus;
  updatedAt: string;
  history: MoisturePinHistoryEntry[];
}

export interface TrackedMaterial {
  id: string;
  roomId: string;
  roomName: string;
  name: string;
  assemblyType: 'Drywall' | 'Subfloor' | 'Hardwood' | 'Framing' | 'CarpetPad' | 'Masonry';
  currentMcPercent: number;
  dryGoalPercent: number;
  status: 'Wet' | 'Drying' | 'Dry' | 'DemoRequired';
  salvageable: boolean;
  notes?: string;
}

export interface Reading {
  id: string;
  projectId: string;
  roomId: string;
  roomName: string;
  timestamp: string;
  tempF: number;
  rhPercent: number;
  gpp: number;
  dewPointF: number;
  vaporPressureInHg: number;
  mcPercent: number;
  technician: string;
}

export type EquipmentType = 'LGR_DEHU' | 'AIR_MOVER' | 'HEPA_SCRUBBER' | 'INJECTIDRY';

export type AssetSyncState = 'Synced' | 'Syncing' | 'Queued in IDB' | 'Sync Retry';

export interface PlacedEquipment {
  id: string;
  projectId: string;
  roomId: string;
  roomName: string;
  type: EquipmentType;
  model: string;
  serialNumber: string;
  ampDraw: number;
  dailyRate: number;
  runtimeHours: number;
  ahamPpd?: number;
  cfm?: number;
  status: 'Running' | 'Standby' | 'Extracted';
  circuitId: string;
  syncState?: AssetSyncState;
  updatedAt: string;
}

export interface Room {
  id: string;
  name: string;
  lengthFt: number;
  widthFt: number;
  heightFt: number;
  areaSqFt: number;
  volumeCuFt: number;
  flooringMaterial: string;
  wallMaterial: string;
  trimMaterial: string;
  wetAreaSqFt: number;
  svgRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ChecklistTask {
  id: string;
  phaseNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  phaseTitle: string;
  code: string;
  title: string;
  standardRef: string;
  completed: boolean;
  requiredForCat: WaterCategory[];
  requiredForClass: LossClass[];
  completedAt?: string;
  completedBy?: string;
  safetyCritical?: boolean;
}

export interface ScopeLineItem {
  id: string;
  xactCode: string;
  category: string;
  description: string;
  quantity: number;
  unit: 'SF' | 'LF' | 'EA' | 'DA' | 'HR';
  unitPrice: number;
  total: number;
  roomName: string;
  iicrcJustification: string;
}

export interface SignedAuthorization {
  id: string;
  projectId: string;
  signerName: string;
  signerRole: 'Property Owner' | 'Insurance Adjuster' | 'Lead IICRC Technician';
  authorizationType: 'Work Authorization & Direction to Pay' | 'Antimicrobial Application Consent' | 'Certificate of Satisfaction & Dry Standard';
  signatureDataUrl: string;
  verificationHash: string;
  signedAt: string;
}

export interface Project {
  id: string;
  lossNumber: string;
  companyId: string;
  ownerId: string;
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
  moldCondition?: 'NONE' | 'CONDITION_1' | 'CONDITION_2' | 'CONDITION_3';
  stage: ProjectStage;
  assignedUnitId?: string;
  slaPriority?: 'Emergency 60m' | 'Urgent 2h' | 'Standard 4h';
  dispatchDirective?: string;
  createdAt: string;
  updatedAt: string;
  floorplanSvg?: string;
  rooms: Room[];
  pins: MoistureMapPin[];
  materials: TrackedMaterial[];
  readings: Reading[];
  equipment: PlacedEquipment[];
  checklist: ChecklistTask[];
  scopeItems: ScopeLineItem[];
  authorizations: SignedAuthorization[];
  aiSummaryReport?: string;
  syncState?: AssetSyncState;
}

export type LossFile = Project;

export interface FieldUnit {
  id: string;
  companyId: string;
  ownerId: string;
  callsign: string;
  leadTech: string;
  certifications: string[];
  vehicle: string;
  status: 'Available' | 'Dispatched' | 'OnSite' | 'StandDown';
  activeProjectId: string;
  directive: string;
  slaPriority: 'Emergency 60m' | 'Urgent 2h' | 'Standard 4h' | 'None';
  latitude: number;
  longitude: number;
  syncState: AssetSyncState;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'project' | 'reading' | 'equipment' | 'pin' | 'dispatch';
  entityId: string;
  projectId: string;
  action: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  queuedAt: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  lastError?: string;
}

export interface CloudEventMessage<T = Record<string, unknown>> {
  specversion: '1.0';
  id: string;
  source: string;
  type: string;
  time: string;
  severity: 'nominal' | 'warning' | 'hazard';
  title: string;
  message: string;
  data?: T;
}

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  companyId: string;
  companyName: string;
  role: Role;
  permissions: Permission[];
}
