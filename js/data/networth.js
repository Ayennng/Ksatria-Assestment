/**
 * Net-worth tiers used to colour each tile:
 *   red    – below $100K
 *   orange – $100K to $200K (inclusive)
 *   green  – above $200K
 */
export const LOW_THRESHOLD = 100_000;
export const HIGH_THRESHOLD = 200_000;

export const TIERS = Object.freeze([
  Object.freeze({ key: 'low', label: '< $100K', color: '#EF3022' }),
  Object.freeze({ key: 'mid', label: '$100K – $200K', color: '#F7941D' }),
  Object.freeze({ key: 'high', label: '> $200K', color: '#3A9F48' }),
]);

/**
 * Parses values such as "$251,260.80", "251260.8" or 251260.8.
 * @returns {number} the amount, or NaN when it cannot be read
 */
export function parseCurrency(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : NaN;
}

/** @returns {'low'|'mid'|'high'|'unknown'} */
export function tierFor(netWorth) {
  if (!Number.isFinite(netWorth)) return 'unknown';
  if (netWorth < LOW_THRESHOLD) return 'low';
  if (netWorth > HIGH_THRESHOLD) return 'high';
  return 'mid';
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatCurrency(amount) {
  return Number.isFinite(amount) ? usd.format(amount) : '—';
}
