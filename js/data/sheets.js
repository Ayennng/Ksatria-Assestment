import { parseCsv } from './csv.js';

/**
 * Reads the raw rows of a Google Sheet.
 *
 * Two transports are supported so the page works with or without an API key:
 *  - Sheets API v4 (`values.get`) when `apiKey` is provided
 *  - the gviz CSV endpoint otherwise
 * Both require the sheet to be shared as "Anyone with the link: Viewer".
 */

export function buildSheetsApiUrl({ id, range = 'A1:F', apiKey }) {
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}`,
  );
  url.searchParams.set('key', apiKey);
  url.searchParams.set('valueRenderOption', 'FORMATTED_VALUE');
  return url.href;
}

export function buildGvizCsvUrl({ id, range = 'A1:F' }) {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq`);
  url.searchParams.set('tqx', 'out:csv');
  url.searchParams.set('headers', '1');
  url.searchParams.set('range', range);
  return url.href;
}

/**
 * @param {{ id: string, range?: string, apiKey?: string }} sheet
 * @param {typeof fetch} [fetchImpl] injectable for tests
 * @returns {Promise<string[][]>} header row followed by data rows
 */
export async function fetchSheetRows(sheet, fetchImpl = globalThis.fetch) {
  if (!sheet?.id) throw new Error('No Google Sheet ID is configured.');

  return sheet.apiKey ? fetchViaSheetsApi(sheet, fetchImpl) : fetchViaGviz(sheet, fetchImpl);
}

async function fetchViaSheetsApi(sheet, fetchImpl) {
  const response = await request(fetchImpl, buildSheetsApiUrl(sheet));
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const reason = body?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Google Sheets API error: ${reason}`);
  }
  return Array.isArray(body.values) ? body.values : [];
}

async function fetchViaGviz(sheet, fetchImpl) {
  const response = await request(fetchImpl, buildGvizCsvUrl(sheet));
  const text = await response.text();

  // A private sheet answers with an HTML sign-in page instead of CSV.
  if (!response.ok || /^\s*</.test(text)) {
    throw new Error('The Google Sheet is not publicly readable. Share it as "Anyone with the link: Viewer".');
  }
  return parseCsv(text);
}

async function request(fetchImpl, url) {
  try {
    return await fetchImpl(url, { headers: { Accept: 'application/json, text/csv' } });
  } catch (cause) {
    throw new Error('Could not reach Google Sheets. Check your connection and the sheet sharing settings.', { cause });
  }
}
