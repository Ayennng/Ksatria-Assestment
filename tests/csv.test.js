import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseCsv } from '../js/data/csv.js';

test('parses plain rows', () => {
  assert.deepEqual(parseCsv('a,b\n1,2\n'), [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('keeps commas inside quoted fields', () => {
  assert.deepEqual(parseCsv('name,worth\nLee,"$251,260.80"'), [
    ['name', 'worth'],
    ['Lee', '$251,260.80'],
  ]);
});

test('unescapes doubled quotes and keeps newlines inside quotes', () => {
  assert.deepEqual(parseCsv('"say ""hi""","line1\nline2"'), [['say "hi"', 'line1\nline2']]);
});

test('handles CRLF line endings, BOM and a missing trailing newline', () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n1,2'), [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('keeps empty cells', () => {
  assert.deepEqual(parseCsv('a,,c\n,,\n'), [
    ['a', '', 'c'],
    ['', '', ''],
  ]);
});

test('parses the assignment CSV into 200 data rows of 6 columns', async () => {
  const text = await readFile(new URL('../data/data-template.csv', import.meta.url), 'utf8');
  const rows = parseCsv(text);
  assert.equal(rows.length, 201);
  assert.ok(rows.every((row) => row.length === 6));
});
