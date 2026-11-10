import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Compass, MapPin, ArrowRight } from 'lucide-react';
import { useApp } from '../AppContext';
import { GeocodingGranularity, LossClass, WaterCategory } from '../types';

export const NewProject: React.FC = () => {
  const { createProject, setActiveNav } = useApp();

  const [clientName, setClientName] = useState(
    'Apex Semiconductor Fab — Cleanroom Support Wing'
  );
  const [clientPhone, setClientPhone] = useState('(512) 555-0188');
  const [clientEmail, setClientEmail] = useState('facilities@apexsemi.io');
  const [insuranceCarrier, setInsuranceCarrier] = useState('FM Global Commercial');
  const [claimNumber, setClaimNumber] = useState('FMG-2026-9084');
  const [adjusterName, setAdjusterName] = useState('logan.vance@fmglobal.com');

  const [latitudeInput, setLatitudeInput] = useState('30.2672');
  const [longitudeInput, setLongitudeInput] = useState('-97.7431');
  const [lossAddress, setLossAddress] = useState(
    '100 Congress Ave, Austin, TX 78701, USA'
  );
  const [granularity, setGranularity] = useState<GeocodingGranularity>('ROOFTOP');
  const [placeId, setPlaceId] = useState('ChIJLwPMoJm1RIYRetVp1EtGm10');
  const [geocodeSource, setGeocodeSource] = useState('Backend Geocode Telemetry');

  const [waterCategory, setWaterCategory] = useState<WaterCategory>('CAT_2');
  const [lossClass, setLossClass] = useState<LossClass>('CLASS_2');
  const [initialRoomName, setInitialRoomName] = useState(
    'Sub-Fab Chiller Riser Corridor'
  );
  const [initialAreaSqFt, setInitialAreaSqFt] = useState('640');

  const lastResolvedPairRef = useRef<string>('30.2672,-97.7431');

  // Quietly resolve latitude & longitude into a verified street address via backend proxy
  const resolveCoordinatesInBackend = useCallback(
    async (latVal?: number, lngVal?: number): Promise<{
      formattedAddress: string;
      granularity: GeocodingGranularity;
      placeId: string;
    } | null> => {
      const lat = latVal !== undefined ? latVal : Number(latitudeInput);
      const lng = lngVal !== undefined ? lngVal : Number(longitudeInput);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return null;
      }

      try {
        const res = await fetch('/api/maps/reverse-geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        });

        if (res.status === 429) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          return null;
        }

        if (!res.ok) {
          return null;
        }

        const data = await res.json();
        if (data?.error?.status === 'RESOURCE_EXHAUSTED') {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          return null;
        }

        const resolvedAddress =
          data.formattedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const resolvedGranularity =
          (data.granularity as GeocodingGranularity) || 'ROOFTOP';
        const resolvedPlaceId = data.placeId || '';

        setLossAddress(resolvedAddress);
        setGranularity(resolvedGranularity);
        setPlaceId(resolvedPlaceId);
        setGeocodeSource(
          data.source === 'google_maps_v4'
            ? 'Google Maps Geocoding API v4'
            : 'Backend Coordinate Resolver'
        );
        lastResolvedPairRef.current = `${lat.toFixed(4)},${lng.toFixed(4)}`;

        return {
          formattedAddress: resolvedAddress,
          granularity: resolvedGranularity,
          placeId: resolvedPlaceId,
        };
      } catch {
        // Handled quietly in the background without disturbing technician workflow
        return null;
      }
    },
    [latitudeInput, longitudeInput]
  );

  // Automatically calculate street address quietly in the backend when lat/lng inputs change
  useEffect(() => {
    const lat = Number(latitudeInput);
    const lng = Number(longitudeInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const pairKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (pairKey === lastResolvedPairRef.current) return;

    const timer = window.setTimeout(() => {
      void resolveCoordinatesInBackend(lat, lng);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [latitudeInput, longitudeInput, resolveCoordinatesInBackend]);

  const handleUseDeviceGps = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lng = Number(pos.coords.longitude.toFixed(4));
          setLatitudeInput(String(lat));
          setLongitudeInput(String(lng));
          void resolveCoordinatesInBackend(lat, lng);
        },
        () => {
          const fallbackLat = 30.2711;
          const fallbackLng = -97.7437;
          setLatitudeInput(String(fallbackLat));
          setLongitudeInput(String(fallbackLng));
          void resolveCoordinatesInBackend(fallbackLat, fallbackLng);
        },
        { timeout: 3000 }
      );
    } else {
      const fallbackLat = 30.2711;
      const fallbackLng = -97.7437;
      setLatitudeInput(String(fallbackLat));
      setLongitudeInput(String(fallbackLng));
      void resolveCoordinatesInBackend(fallbackLat, fallbackLng);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const lat = Number.isFinite(Number(latitudeInput))
      ? Number(latitudeInput)
      : 30.2672;
    const lng = Number.isFinite(Number(longitudeInput))
      ? Number(longitudeInput)
      : -97.7431;

    let finalAddress = lossAddress.trim();
    let finalGranularity = granularity;
    let finalPlaceId = placeId;

    const pairKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (!finalAddress || pairKey !== lastResolvedPairRef.current) {
      const resolved = await resolveCoordinatesInBackend(lat, lng);
      if (resolved) {
        finalAddress = resolved.formattedAddress;
        finalGranularity = resolved.granularity;
        finalPlaceId = resolved.placeId;
      }
    }

    await createProject({
      clientName: clientName.trim() || 'Commercial Property Loss',
      clientPhone,
      clientEmail,
      insuranceCarrier,
      claimNumber,
      adjusterName,
      lossAddress: finalAddress || '100 Congress Ave, Austin, TX 78701, USA',
      latitude: lat,
      longitude: lng,
      granularity: finalGranularity,
      placeId: finalPlaceId,
      waterCategory,
      lossClass,
      initialRoomName,
      initialAreaSqFt: Number(initialAreaSqFt) || 500,
    });

    setActiveNav('dashboard');
  };

  return (
    <div className="space-y-6" data-testid="new-project-view">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display">
            Emergency Loss Intake & GPS Telemetry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Latitude and longitude coordinates are quietly resolved into verified street
            addresses in the backend and linked to your ANSI/IICRC S500 & S520 dossier.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Intake Form with Quiet Backend Coordinate Resolution */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 space-y-6 obsidian-card rounded-2xl p-6"
        >
          {/* Section 1: GPS Coordinates & Quiet Backend Street Address Resolution */}
          <div className="space-y-4 pb-6 border-b border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  1. Field GPS Coordinates & Verified Loss Address
                </h2>
                <p className="text-xs text-slate-400">
                  Coordinates automatically resolve to a verified street address via
                  backend geocoding
                </p>
              </div>
              <button
                type="button"
                onClick={handleUseDeviceGps}
                data-testid="use-device-gps-btn"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Use Device GPS</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="intake-lat"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Latitude (°N/S)
                </label>
                <input
                  id="intake-lat"
                  data-testid="intake-lat-input"
                  type="number"
                  step="any"
                  value={latitudeInput}
                  onChange={(e) => setLatitudeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm font-mono tabular-nums text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="intake-lng"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Longitude (°E/W)
                </label>
                <input
                  id="intake-lng"
                  data-testid="intake-lng-input"
                  type="number"
                  step="any"
                  value={longitudeInput}
                  onChange={(e) => setLongitudeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm font-mono tabular-nums text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="intake-address"
                  className="block text-xs font-medium text-slate-300"
                >
                  Verified Loss Street Address (Auto-Synced in Backend)
                </label>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {granularity}
                </span>
              </div>
              <input
                id="intake-address"
                data-testid="intake-address-input"
                type="text"
                value={lossAddress}
                onChange={(e) => setLossAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Client & Carrier Details */}
          <div className="space-y-4 pb-6 border-b border-white/10">
            <h2 className="text-base font-semibold text-white">
              2. Property Owner & Carrier Metadata
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="intake-client"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Client / Commercial Account Name
                </label>
                <input
                  id="intake-client"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="intake-phone"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Emergency Contact Phone
                </label>
                <input
                  id="intake-phone"
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm font-mono tabular-nums text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="intake-email"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Client Email
                </label>
                <input
                  id="intake-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="intake-carrier"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Insurance Carrier
                </label>
                <input
                  id="intake-carrier"
                  type="text"
                  value={insuranceCarrier}
                  onChange={(e) => setInsuranceCarrier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="intake-claim"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Claim Number
                </label>
                <input
                  id="intake-claim"
                  type="text"
                  value={claimNumber}
                  onChange={(e) => setClaimNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm font-mono tabular-nums text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="intake-adjuster"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Assigned Carrier Adjuster / Industrial Hygienist
                </label>
                <input
                  id="intake-adjuster"
                  type="text"
                  value={adjusterName}
                  onChange={(e) => setAdjusterName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: ANSI/IICRC S500 Classification */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">
              3. ANSI/IICRC S500 Hazard Category & Evaporation Class
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="intake-cat"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Water Contamination Category
                </label>
                <select
                  id="intake-cat"
                  value={waterCategory}
                  onChange={(e) => setWaterCategory(e.target.value as WaterCategory)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="CAT_1">
                    CAT_1 — Sanitary Water Source (S500 §10.4.1)
                  </option>
                  <option value="CAT_2">
                    CAT_2 — Significantly Contaminated / Gray Water (S500 §10.4.2)
                  </option>
                  <option value="CAT_3">
                    CAT_3 — Grossly Contaminated / Black Water Biohazard (S500 §10.4.3)
                  </option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="intake-class"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Evaporation Load Class
                </label>
                <select
                  id="intake-class"
                  value={lossClass}
                  onChange={(e) => setLossClass(e.target.value as LossClass)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="CLASS_1">
                    CLASS_1 — Least Evaporation (&lt;5% Wet Porous Surface)
                  </option>
                  <option value="CLASS_2">
                    CLASS_2 — Significant Evaporation (5%–40% Wet Surface)
                  </option>
                  <option value="CLASS_3">
                    CLASS_3 — Greatest Evaporation (&gt;40% Walls/Ceilings)
                  </option>
                  <option value="CLASS_4">
                    CLASS_4 — Specialty Deep-Pocket Bound Water (Hardwood/Plaster)
                  </option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="intake-room"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Primary Affected Chamber Name
                </label>
                <input
                  id="intake-room"
                  type="text"
                  value={initialRoomName}
                  onChange={(e) => setInitialRoomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="intake-area"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Initial Chamber Area (SF)
                </label>
                <input
                  id="intake-area"
                  type="number"
                  value={initialAreaSqFt}
                  onChange={(e) => setInitialAreaSqFt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-sm font-mono tabular-nums text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                data-testid="submit-new-project-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap"
              >
                <span>Initialize Loss File & Adaptive S500 Checklist</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Right 5 Columns: Interactive Location Legend & Pin Status Key */}
        <div
          className="lg:col-span-5 space-y-5 obsidian-card rounded-2xl p-6"
          data-testid="location-legend-card"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">
                Location Legend & Pin Status Key
              </h2>
            </div>
            <span className="text-xs font-mono tabular-nums text-cyan-400">
              {granularity}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#090d16] border border-white/10 space-y-2">
              <div className="text-slate-400">Verified Loss Address</div>
              <div
                className="text-sm font-semibold text-white"
                data-testid="legend-verified-address"
              >
                {lossAddress}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono tabular-nums text-slate-300">
                <span data-testid="legend-gps-coords">
                  GPS: {Number(latitudeInput || 0).toFixed(4)}° N,{' '}
                  {Number(longitudeInput || 0).toFixed(4)}° W
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-400">Granularity: {granularity}</span>
              </div>
              {placeId && (
                <div className="font-mono tabular-nums text-[11px] text-slate-500 truncate">
                  Place ID: {placeId} · {geocodeSource}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-[#090d16] border border-white/10 space-y-2">
              <div className="text-slate-400">
                ANSI/IICRC S500 Classification Telemetry
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Water Contamination Category</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    waterCategory === 'CAT_3'
                      ? 'text-rose-400'
                      : waterCategory === 'CAT_2'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {waterCategory}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Evaporation Load Class</span>
                <span className="font-mono font-semibold tabular-nums text-cyan-400">
                  {lossClass}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Required Containment / PPE</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {waterCategory === 'CAT_3'
                    ? 'Full 6-Mil Critical Barrier + P100 + 6 ACH HEPA'
                    : waterCategory === 'CAT_2'
                    ? 'Containment Isolation + N95 + Biocide'
                    : 'Standard Psychrometric Stabilization'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090d16] border border-white/10 space-y-2.5">
              <div className="text-slate-400 font-medium">
                2D Floorplan & Field Map Pin Status Key
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-rose-400 font-medium shrink-0">
                    Wet / CAT 3 Hazard Pin
                  </span>
                  <span className="font-mono tabular-nums text-slate-400 text-right">
                    &gt; 22.0% MC (Active Demo)
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-amber-400 font-medium shrink-0">
                    Drying / Queued in IDB Pin
                  </span>
                  <span className="font-mono tabular-nums text-slate-400 text-right">
                    12.1% – 22.0% MC (LGR Drying)
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-emerald-400 font-medium shrink-0">
                    Dry / Nominal Standard Pin
                  </span>
                  <span className="font-mono tabular-nums text-slate-400 text-right">
                    ≤ 12.0% MC Wood / ≤ 0.5% Drywall
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
