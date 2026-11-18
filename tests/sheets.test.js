import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fetchSheetRows, buildSheetsApiUrl, buildGvizCsvUrl } from '../js/data/sheets.js';

const SHEET_ID = 'sheet123';

function mockFetch({ status = 200, body = '', json } = {}) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => body,
      json: async () => json ?? JSON.parse(body),
    };
  };
  return { fetchImpl, calls };
}

test('builds a Sheets API v4 values URL', () => {
  const url = new URL(buildSheetsApiUrl({ id: SHEET_ID, range: 'A1:F', apiKey: 'KEY' }));
  assert.equal(url.origin + url.pathname, 'https://sheets.googleapis.com/v4/spreadsheets/sheet123/values/A1%3AF');
  assert.equal(url.searchParams.get('key'), 'KEY');
});

test('builds a gviz CSV URL', () => {
  const url = new URL(buildGvizCsvUrl({ id: SHEET_ID, range: 'A1:F' }));
  assert.equal(url.pathname, '/spreadsheets/d/sheet123/gviz/tq');
  assert.equal(url.searchParams.get('tqx'), 'out:csv');
});

test('uses the Sheets API when an API key is configured', async () => {
  const values = [['Name', 'Net Worth'], ['A', '$1']];
  const { fetchImpl, calls } = mockFetch({ json: { values } });
  assert.deepEqual(await fetchSheetRows({ id: SHEET_ID, apiKey: 'KEY' }, fetchImpl), values);
  assert.match(calls[0], /sheets\.googleapis\.com/);
});

test('falls back to gviz CSV without an API key', async () => {
  const { fetchImpl, calls } = mockFetch({ body: '"Name","Net Worth"\n"A","$1,000.00"\n' });
  assert.deepEqual(await fetchSheetRows({ id: SHEET_ID }, fetchImpl), [
    ['Name', 'Net Worth'],
    ['A', '$1,000.00'],
  ]);
  assert.match(calls[0], /docs\.google\.com/);
});

test('surfaces Sheets API error messages', async () => {
  const { fetchImpl } = mockFetch({ status: 403, json: { error: { message: 'API key not valid' } } });
  await assert.rejects(fetchSheetRows({ id: SHEET_ID, apiKey: 'bad' }, fetchImpl), /API key not valid/);
});

test('explains a private sheet (HTML sign-in page instead of CSV)', async () => {
  const { fetchImpl } = mockFetch({ body: '<!DOCTYPE html><html>Sign in</html>' });
  await assert.rejects(fetchSheetRows({ id: SHEET_ID }, fetchImpl), /not publicly readable/);
});

test('wraps network failures with a readable message', async () => {
  const failing = async () => {
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(fetchSheetRows({ id: SHEET_ID }, failing), /Could not reach Google Sheets/);
});

test('requires a sheet ID', async () => {
  await assert.rejects(fetchSheetRows({ id: '' }), /No Google Sheet ID/);
});
