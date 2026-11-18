import { parseCurrency, tierFor } from './networth.js';

/**
 * Accepted header spellings per field. Headers are compared trimmed and
 * case-insensitively, so " Net Worth " in the source CSV still matches.
 */
const HEADER_ALIASES = Object.freeze({
  name: ['name', 'full name'],
  photo: ['photo', 'photo url', 'image', 'picture'],
  age: ['age'],
  country: ['country', 'country code'],
  interest: ['interest', 'interests', 'hobby'],
  netWorth: ['net worth', 'networth', 'net_worth'],
});

const REQUIRED_FIELDS = ['name', 'netWorth'];

/**
 * @typedef {object} Person
 * @property {number} id
 * @property {string} name
 * @property {string} photo     absolute http(s) URL, or '' when missing/unsafe
 * @property {number|null} age
 * @property {string} country
 * @property {string} interest
 * @property {number} netWorth  NaN when unreadable
 * @property {'low'|'mid'|'high'|'unknown'} tier
 */

/**
 * Converts a header row + data rows (from the Sheets API or a CSV) into Person records.
 * @param {unknown[][]} rows
 * @returns {Person[]}
 */
export function rowsToPeople(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const [header, ...body] = rows;
  const columns = mapHeader(header);

  return body
    .filter((row) => Array.isArray(row) && row.some((cell) => cleanText(cell) !== ''))
    .map((row, index) => {
      const netWorth = parseCurrency(row[columns.netWorth]);
      return {
        id: index,
        name: cleanText(row[columns.name]),
        photo: safeHttpUrl(row[columns.photo]),
        age: parseAge(row[columns.age]),
        country: cleanText(row[columns.country]).toUpperCase(),
        interest: cleanText(row[columns.interest]),
        netWorth,
        tier: tierFor(netWorth),
      };
    });
}

/** @returns {Record<keyof typeof HEADER_ALIASES, number>} column index per field (-1 if absent) */
export function mapHeader(header) {
  const normalized = (header ?? []).map((cell) => cleanText(cell).toLowerCase());
  const columns = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    columns[field] = normalized.findIndex((h) => aliases.includes(h));
  }

  const missing = REQUIRED_FIELDS.filter((field) => columns[field] === -1);
  if (missing.length > 0) {
    throw new Error(`Sheet is missing required column(s): ${missing.join(', ')}`);
  }
  return columns;
}

/**
 * Trims, collapses whitespace and drops U+FFFD replacement characters
 * (the source CSV contains a couple of mis-encoded names).
 */
export function cleanText(value) {
  return String(value ?? '')
    .replace(/�/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function safeHttpUrl(value) {
  const text = cleanText(value);
  if (!text) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

function parseAge(value) {
  const age = Number.parseInt(cleanText(value), 10);
  return Number.isFinite(age) && age >= 0 ? age : null;
}
