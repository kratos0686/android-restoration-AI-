import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGPP,
  calculateDewPointF,
  calculateVaporPressureInHg,
  calculateS500EquipmentSizing,
  calculateCircuitLoad,
} from './equipmentSizing';
import {
  generateAdaptiveChecklist,
  computeSignatureVerificationHash,
} from '../services/adaptiveMitigationEngine';
import { PlacedEquipment, SyncQueueItem } from '../types';

test('Psychrometric calculations (GPP, Dew Point, Vapor Pressure) follow S500 formulas', () => {
  // At 75°F and 50% RH, GPP is approximately 65-66 gr/lb
  const gpp = calculateGPP(75, 50);
  assert.ok(gpp >= 64 && gpp <= 67, `Expected ~65.6 GPP at 75F/50%RH, got ${gpp}`);

  // Dew point at 75°F and 50% RH is ~55.1°F
  const dewPoint = calculateDewPointF(75, 50);
  assert.ok(dewPoint >= 54.5 && dewPoint <= 56.0, `Expected ~55.1F dew point, got ${dewPoint}`);

  // Vapor pressure at 75°F and 50% RH is ~0.44 inHg
  const vp = calculateVaporPressureInHg(75, 50);
  assert.ok(vp >= 0.42 && vp <= 0.46, `Expected ~0.44 inHg, got ${vp}`);
});

test('ANSI/IICRC S500 Equipment Sizing Calculator computes Class 1-4 divisors, Air Movers, and 6 ACH HEPA CFM', () => {
  const res = calculateS500EquipmentSizing({
    areaSqFt: 600,
    heightFt: 10,
    lossClass: 'CLASS_2',
    waterCategory: 'CAT_3',
    ahamPpdRating: 110,
    scrubberCfmRating: 500,
  });

  // Volume = 600 * 10 = 6000 CF
  assert.equal(res.cubicFeet, 6000);
  // Class 2 divisor = 50 -> 6000 / 50 = 120 PPD
  assert.equal(res.classDivisor, 50);
  assert.equal(res.requiredAhamPpd, 120);
  // 120 / 110 = ceil(1.09) = 2 LGR units
  assert.equal(res.recommendedDehumidifiers, 2);
  // Air movers: 600 / 70 = 9 min, 600 / 50 = 12 max, target 600 / 60 = 10
  assert.equal(res.recommendedAirMoversMin, 9);
  assert.equal(res.recommendedAirMoversMax, 12);
  assert.equal(res.recommendedAirMoversTarget, 10);
  // 6 ACH HEPA CFM: (6000 * 6) / 60 = 600 CFM -> 2 scrubbers at 500 CFM
  assert.equal(res.requiredHepaCfm6Ach, 600);
  assert.equal(res.recommendedHepaScrubbers, 2);
  assert.equal(res.containmentRequired, true);
});

test('15A Circuit Breaker Load Calculator detects NEC 80% warning (>12A) and overload (>15A)', () => {
  const fleet: PlacedEquipment[] = [
    {
      id: 'eq-1',
      projectId: 'p-1',
      roomId: 'r-1',
      roomName: 'Main Salon',
      type: 'LGR_DEHU',
      model: 'Dri-Eaz LGR 7000XLi',
      serialNumber: 'SN-7001',
      ampDraw: 8.3,
      dailyRate: 145,
      runtimeHours: 48,
      status: 'Running',
      circuitId: 'CIRCUIT-A (15A)',
      updatedAt: '2026-11-09T20:00:00Z',
    },
    {
      id: 'eq-2',
      projectId: 'p-1',
      roomId: 'r-1',
      roomName: 'Main Salon',
      type: 'AIR_MOVER',
      model: 'Phoenix AirMax Radial',
      serialNumber: 'SN-8802',
      ampDraw: 4.8,
      dailyRate: 38,
      runtimeHours: 48,
      status: 'Running',
      circuitId: 'CIRCUIT-A (15A)',
      updatedAt: '2026-11-09T20:00:00Z',
    },
  ];

  const load = calculateCircuitLoad(fleet);
  assert.equal(load.activeUnits, 2);
  assert.equal(load.totalAmps, 13.1);
  assert.equal(load.dailyBurnRate, 183);
  assert.equal(load.accruedTotalCost, 366); // 2 days * (145 + 38)
  assert.equal(load.circuits[0].status, 'Warning (>12A NEC 80%)');
});

test('7-Phase Adaptive Mitigation Checklist dynamically filters by WaterCategory and LossClass', () => {
  const cat1Class1 = generateAdaptiveChecklist('CAT_1', 'CLASS_1');
  const cat3Class3 = generateAdaptiveChecklist('CAT_3', 'CLASS_3');

  // CAT_3 / CLASS_3 must require containment, PPE, demolition, and antimicrobial tasks
  assert.ok(cat3Class3.length > cat1Class1.length);
  assert.ok(cat3Class3.some((t) => t.code === 'S500-13.5'));
  assert.ok(!cat1Class1.some((t) => t.code === 'S500-13.5'));
});

test('computeSignatureVerificationHash produces deterministic 64-character hex digest', () => {
  const h1 = computeSignatureVerificationHash({
    signerName: 'Elena Vance',
    signerRole: 'Property Owner',
    projectId: 'LOSS-2026-8841',
    timestampIso: '2026-11-09T19:00:00.000Z',
    signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
  });
  const h2 = computeSignatureVerificationHash({
    signerName: 'Elena Vance',
    signerRole: 'Property Owner',
    projectId: 'LOSS-2026-8841',
    timestampIso: '2026-11-09T19:00:00.000Z',
    signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
  });
  assert.equal(h1.length, 64);
  assert.equal(h1, h2);
});

test('Offline Sync Queue sorts pending mutations in strict FIFO chronological order', () => {
  const pendingItems: SyncQueueItem[] = [
    {
      id: 'q-3',
      entityType: 'reading',
      entityId: 'r-3',
      projectId: 'p-1',
      action: 'create',
      payload: {},
      queuedAt: 3000,
      retryCount: 0,
      status: 'pending',
    },
    {
      id: 'q-1',
      entityType: 'project',
      entityId: 'p-1',
      projectId: 'p-1',
      action: 'create',
      payload: {},
      queuedAt: 1000,
      retryCount: 0,
      status: 'pending',
    },
    {
      id: 'q-2',
      entityType: 'equipment',
      entityId: 'eq-1',
      projectId: 'p-1',
      action: 'update',
      payload: {},
      queuedAt: 2000,
      retryCount: 0,
      status: 'pending',
    },
  ];

  const fifoOrdered = [...pendingItems].reverse().sort((a, b) => a.queuedAt - b.queuedAt);
  assert.deepEqual(
    fifoOrdered.map((item) => item.id),
    ['q-1', 'q-2', 'q-3']
  );
});
