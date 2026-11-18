import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseCsv } from '../js/data/csv.js';
import { rowsToPeople, mapHeader, cleanText, safeHttpUrl } from '../js/data/people.js';
import { parseCurrency, tierFor, formatCurrency } from '../js/data/networth.js';

test('parseCurrency reads formatted dollar strings and numbers', () => {
  assert.equal(parseCurrency('$251,260.80'), 251260.8);
  assert.equal(parseCurrency(' $60,393.60 '), 60393.6);
  assert.equal(parseCurrency(1234.5), 1234.5);
  assert.ok(Number.isNaN(parseCurrency('')));
  assert.ok(Number.isNaN(parseCurrency('n/a')));
});

test('tierFor: red < $100K, orange $100K–$200K, green > $200K', () => {
  assert.equal(tierFor(99_999.99), 'low');
  assert.equal(tierFor(100_000), 'mid');
  assert.equal(tierFor(150_000), 'mid');
  assert.equal(tierFor(200_000), 'mid');
  assert.equal(tierFor(200_000.01), 'high');
  assert.equal(tierFor(NaN), 'unknown');
});

test('formatCurrency renders USD and a dash for unknown', () => {
  assert.equal(formatCurrency(251260.8), '$251,260.80');
  assert.equal(formatCurrency(NaN), '—');
});

test('mapHeader matches the padded " Net Worth " header case-insensitively', () => {
  const columns = mapHeader(['Name', 'Photo', 'Age', 'Country', 'Interest', ' Net Worth ']);
  assert.deepEqual(columns, { name: 0, photo: 1, age: 2, country: 3, interest: 4, netWorth: 5 });
});

test('mapHeader rejects a sheet without required columns', () => {
  assert.throws(() => mapHeader(['Photo', 'Age']), /name, netWorth/);
});

test('cleanText strips U+FFFD and collapses whitespace', () => {
  assert.equal(cleanText('Mohd Hanafi Azhar�'), 'Mohd Hanafi Azhar');
  assert.equal(cleanText('  Lee   Siew\tSuan '), 'Lee Siew Suan');
});

test('safeHttpUrl only allows http(s) URLs', () => {
  assert.equal(safeHttpUrl('https://static.kasatria.com/a.jpg'), 'https://static.kasatria.com/a.jpg');
  assert.equal(safeHttpUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpUrl('not a url'), '');
});

test('rowsToPeople maps rows and skips blank lines', () => {
  const people = rowsToPeople([
    ['Name', 'Photo', 'Age', 'Country', 'Interest', 'Net Worth'],
    ['Lee Siew Suan', 'https://x.test/019.jpg', '25', 'cn', 'Writing', '$251,260.80'],
    ['', '', '', '', '', ''],
    ['New Yee Chian', '', '23', 'CN', 'Cooking', '$60,393.60'],
  ]);

  assert.equal(people.length, 2);
  assert.deepEqual(people[0], {
    id: 0,
    name: 'Lee Siew Suan',
    photo: 'https://x.test/019.jpg',
    age: 25,
    country: 'CN',
    interest: 'Writing',
    netWorth: 251260.8,
    tier: 'high',
  });
  assert.equal(people[1].tier, 'low');
  assert.equal(people[1].photo, '');
});

test('rowsToPeople tolerates short rows from the Sheets API (trailing empties omitted)', () => {
  const [person] = rowsToPeople([
    ['Name', 'Net Worth', 'Interest'],
    ['Solo', '$150,000'],
  ]);
  assert.equal(person.interest, '');
  assert.equal(person.tier, 'mid');
});

test('the assignment data yields 200 people across all three tiers', async () => {
  const text = await readFile(new URL('../data/data-template.csv', import.meta.url), 'utf8');
  const people = rowsToPeople(parseCsv(text));

  assert.equal(people.length, 200);
  assert.ok(people.every((p) => Number.isFinite(p.netWorth) && p.name && p.photo));
  assert.ok(people.every((p) => !p.name.includes('�')));

  const counts = Object.groupBy(people, (p) => p.tier);
  assert.ok(counts.low.length > 0 && counts.mid.length > 0 && counts.high.length > 0);
  assert.equal(counts.unknown, undefined);
});
