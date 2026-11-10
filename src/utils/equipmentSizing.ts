import { LossClass, PlacedEquipment, WaterCategory } from '../types';

/**
 * Calculates atmospheric Grains Per Pound (GPP) of dry air at standard sea-level pressure (29.92 inHg)
 * using the Magnus-Tetens saturation vapor pressure equation per ANSI/IICRC S500 psychrometry.
 */
export function calculateGPP(tempF: number, rhPercent: number): number {
  const clampedRh = Math.max(0, Math.min(100, rhPercent));
  const tempC = ((tempF - 32) * 5) / 9;
  // Saturation vapor pressure in hPa (mb)
  const esHpa = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
  // Actual vapor pressure in hPa
  const eHpa = esHpa * (clampedRh / 100);
  // Convert to inHg
  const eInHg = eHpa * 0.029529983071445;
  const pAtmInHg = 29.921;
  const denom = Math.max(0.5, pAtmInHg - eInHg);
  const humidityRatioLbPerLb = 0.62198 * (eInHg / denom);
  const gpp = humidityRatioLbPerLb * 7000;
  return Math.round(gpp * 10) / 10;
}

/**
 * Calculates atmospheric Dew Point (°F) from Dry Bulb Temp (°F) and Relative Humidity (%).
 */
export function calculateDewPointF(tempF: number, rhPercent: number): number {
  const clampedRh = Math.max(1, Math.min(100, rhPercent));
  const tempC = ((tempF - 32) * 5) / 9;
  const alpha = (17.625 * tempC) / (243.04 + tempC) + Math.log(clampedRh / 100);
  const dewC = (243.04 * alpha) / (17.625 - alpha);
  const dewF = (dewC * 9) / 5 + 32;
  return Math.round(dewF * 10) / 10;
}

/**
 * Calculates Vapor Pressure in inHg.
 */
export function calculateVaporPressureInHg(tempF: number, rhPercent: number): number {
  const clampedRh = Math.max(0, Math.min(100, rhPercent));
  const tempC = ((tempF - 32) * 5) / 9;
  const esHpa = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
  const eHpa = esHpa * (clampedRh / 100);
  const eInHg = eHpa * 0.029529983071445;
  return Math.round(eInHg * 100) / 100;
}

export interface S500SizingInput {
  areaSqFt: number;
  heightFt: number;
  lossClass: LossClass;
  waterCategory: WaterCategory;
  ahamPpdRating?: number;
  scrubberCfmRating?: number;
}

export interface S500SizingResult {
  areaSqFt: number;
  heightFt: number;
  cubicFeet: number;
  classDivisor: number;
  requiredAhamPpd: number;
  recommendedDehumidifiers: number;
  recommendedAirMoversMin: number;
  recommendedAirMoversMax: number;
  recommendedAirMoversTarget: number;
  requiredHepaCfm6Ach: number;
  recommendedHepaScrubbers: number;
  containmentRequired: boolean;
  iicrcFormulaNote: string;
}

export const LOSS_CLASS_DIVISORS: Record<LossClass, number> = {
  CLASS_1: 100,
  CLASS_2: 50,
  CLASS_3: 40,
  CLASS_4: 40,
};

/**
 * ANSI/IICRC S500 Equipment Sizing Calculator:
 * - Dehumidification (AHAM Pints/Day): Cubic Feet / Class Divisor (Class 1: 100, Class 2: 50, Class 3: 40, Class 4: 40 specialty/LGR)
 * - Air Movers: 1 per 50–70 SF of wet floor/wall perimeter
 * - HEPA Air Scrubbers (AFD): 6 Air Changes per Hour (ACH) -> CFM = (Cubic Feet * 6) / 60 = Cubic Feet / 10
 */
export function calculateS500EquipmentSizing(input: S500SizingInput): S500SizingResult {
  const safeArea = Math.max(10, input.areaSqFt);
  const safeHeight = Math.max(6, input.heightFt);
  const ahamRating = Math.max(50, input.ahamPpdRating ?? 110);
  const scrubberRating = Math.max(200, input.scrubberCfmRating ?? 500);

  const cubicFeet = Math.round(safeArea * safeHeight);
  const classDivisor = LOSS_CLASS_DIVISORS[input.lossClass] ?? 50;
  const requiredAhamPpd = Math.ceil(cubicFeet / classDivisor);
  const recommendedDehumidifiers = Math.max(1, Math.ceil(requiredAhamPpd / ahamRating));

  // Air Movers: 1 per 50-70 SF (target 1 per 60 SF + 1 for entry/offset)
  const recommendedAirMoversMin = Math.max(1, Math.ceil(safeArea / 70));
  const recommendedAirMoversMax = Math.max(1, Math.ceil(safeArea / 50));
  const recommendedAirMoversTarget = Math.max(1, Math.ceil(safeArea / 60));

  // 6 ACH HEPA CFM formula: (Volume * 6 ACH) / 60 min/hr
  const requiredHepaCfm6Ach = Math.ceil((cubicFeet * 6) / 60);
  const recommendedHepaScrubbers = Math.max(1, Math.ceil(requiredHepaCfm6Ach / scrubberRating));
  const containmentRequired = input.waterCategory === 'CAT_3' || input.waterCategory === 'CAT_2';

  const iicrcFormulaNote = `${cubicFeet.toLocaleString()} CF ÷ ${classDivisor} (${input.lossClass}) = ${requiredAhamPpd} PPD AHAM | Air Movers: 1 per 50–70 SF (${recommendedAirMoversMin}–${recommendedAirMoversMax}) | HEPA 6 ACH: ${requiredHepaCfm6Ach} CFM`;

  return {
    areaSqFt: safeArea,
    heightFt: safeHeight,
    cubicFeet,
    classDivisor,
    requiredAhamPpd,
    recommendedDehumidifiers,
    recommendedAirMoversMin,
    recommendedAirMoversMax,
    recommendedAirMoversTarget,
    requiredHepaCfm6Ach,
    recommendedHepaScrubbers,
    containmentRequired,
    iicrcFormulaNote,
  };
}

export interface CircuitLoadSummary {
  circuitId: string;
  totalAmps: number;
  utilizationPercent: number;
  status: 'Nominal' | 'Warning (>12A NEC 80%)' | 'Overload (>15A)';
  equipmentCount: number;
}

export interface FleetBurnSummary {
  activeUnits: number;
  totalAmps: number;
  dailyBurnRate: number;
  accruedTotalCost: number;
  circuits: CircuitLoadSummary[];
}

/**
 * Evaluates 15A circuit breaker load (NEC 80% continuous duty = 12.0A safe threshold)
 * and daily equipment burn rate.
 */
export function calculateCircuitLoad(equipment: PlacedEquipment[]): FleetBurnSummary {
  const circuitTotals: Record<string, { amps: number; count: number }> = {};
  let activeUnits = 0;
  let totalAmps = 0;
  let dailyBurnRate = 0;
  let accruedTotalCost = 0;

  for (const item of equipment) {
    const isRunning = item.status === 'Running';
    const circuit = item.circuitId || 'CIRCUIT-A (15A)';
    if (!circuitTotals[circuit]) {
      circuitTotals[circuit] = { amps: 0, count: 0 };
    }
    if (isRunning) {
      activeUnits += 1;
      totalAmps += item.ampDraw;
      dailyBurnRate += item.dailyRate;
      circuitTotals[circuit].amps += item.ampDraw;
      circuitTotals[circuit].count += 1;
    }
    const billingDays = Math.max(1, Math.ceil(item.runtimeHours / 24));
    accruedTotalCost += billingDays * item.dailyRate;
  }

  const circuits: CircuitLoadSummary[] = Object.entries(circuitTotals).map(([circuitId, data]) => {
    const roundedAmps = Math.round(data.amps * 10) / 10;
    const utilizationPercent = Math.round((roundedAmps / 15) * 100);
    let status: CircuitLoadSummary['status'] = 'Nominal';
    if (roundedAmps > 15) {
      status = 'Overload (>15A)';
    } else if (roundedAmps > 12) {
      status = 'Warning (>12A NEC 80%)';
    }
    return {
      circuitId,
      totalAmps: roundedAmps,
      utilizationPercent,
      status,
      equipmentCount: data.count,
    };
  });

  return {
    activeUnits,
    totalAmps: Math.round(totalAmps * 10) / 10,
    dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
    accruedTotalCost: Math.round(accruedTotalCost * 100) / 100,
    circuits,
  };
}
