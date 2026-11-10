import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Google Maps Platform Demo Key Quota Defense (Tier 1 JS SDK auth/quota failure listener)
const prevAuthFailure = (window as unknown as { gm_authFailure?: () => void })
  .gm_authFailure;
(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  prevAuthFailure?.();
};

const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (
    args.some(
      (a) =>
        typeof a === 'string' && /OverQuotaMapError|QuotaExceededError/.test(a)
    )
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
  origConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(<App />);
