/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './AppContext';
import { DesktopApp } from './components/DesktopApp';
import { MobileApp } from './components/MobileApp';
import { CommandCenter } from './components/CommandCenter';
import { EventToast } from './components/EventToast';

const AppShell: React.FC = () => {
  const { gmpQuotaExceeded } = useApp();
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {gmpQuotaExceeded && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 shadow-sm">
          <span>
            <strong>Google Maps Platform free quota reached.</strong> Maps and location
            features are paused until you switch to a billed API key.
          </span>
          <span className="shrink-0 font-medium">
            Open <strong>Settings → Secrets</strong>, replace{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
              GOOGLE_MAPS_API_KEY
            </code>{' '}
            with a key from a billing-enabled Google Cloud project, and reload.
          </span>
        </div>
      )}

      {isMobileViewport ? <MobileApp /> : <DesktopApp />}
      <CommandCenter />
      <EventToast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
