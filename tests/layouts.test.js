import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tableLayout, sphereLayout, doubleHelixLayout, gridLayout, LAYOUTS } from '../js/layouts.js';

const N = 200;
const distinct = (values) => new Set(values.map((v) => Math.round(v * 1000) / 1000)).size;
const xs = (targets) => targets.map((t) => t.position.x);
const ys = (targets) => targets.map((t) => t.position.y);
const zs = (targets) => targets.map((t) => t.position.z);

test('every layout returns one target per tile', () => {
  for (const { build } of Object.values(LAYOUTS)) {
    assert.equal(build(N).length, N);
    assert.equal(build(0).length, 0);
  }
});

test('table is 20 columns × 10 rows, centred on the origin', () => {
  const targets = tableLayout(N);
  assert.equal(distinct(xs(targets)), 20);
  assert.equal(distinct(ys(targets)), 10);
  assert.ok(targets.every((t) => t.position.z === 0 && t.lookAt === null));

  const sum = targets.reduce((acc, t) => acc + t.position.x + t.position.y, 0);
  assert.ok(Math.abs(sum) < 1e-6);
  // First tile top-left, 21st tile starts the second row.
  assert.ok(targets[0].position.x < 0 && targets[0].position.y > 0);
  assert.equal(targets[20].position.x, targets[0].position.x);
  assert.ok(targets[20].position.y < targets[0].position.y);
});

test('table grows extra rows rather than overflowing columns', () => {
  assert.equal(distinct(ys(tableLayout(230))), 12);
  assert.equal(distinct(xs(tableLayout(230))), 20);
});

test('sphere places every tile on the radius, facing outward', () => {
  const radius = 850;
  for (const { position, lookAt } of sphereLayout(N, { radius })) {
    assert.ok(Math.abs(Math.hypot(position.x, position.y, position.z) - radius) < 1e-6);
    assert.deepEqual(lookAt, { x: position.x * 2, y: position.y * 2, z: position.z * 2 });
  }
});

test('helix is a double helix: two strands 180° apart, paired at equal heights', () => {
  const radius = 850;
  const targets = doubleHelixLayout(N, { radius });

  for (let i = 0; i < N; i += 2) {
    const a = targets[i].position;
    const b = targets[i + 1].position;
    assert.ok(Math.abs(a.y - b.y) < 1e-9, 'pair shares a height');
    assert.ok(Math.abs(a.x + b.x) < 1e-6 && Math.abs(a.z + b.z) < 1e-6, 'pair is diametrically opposite');
    assert.ok(Math.abs(Math.hypot(a.x, a.z) - radius) < 1e-6, 'on the cylinder');
  }

  // 100 distinct heights (one per base pair), centred vertically.
  assert.equal(distinct(ys(targets)), N / 2);
  const allY = ys(targets);
  assert.ok(Math.abs(Math.max(...allY) + Math.min(...allY)) < 1e-6);
});

test('grid is 5 × 4 × 10', () => {
  const targets = gridLayout(N);
  assert.equal(distinct(xs(targets)), 5);
  assert.equal(distinct(ys(targets)), 4);
  assert.equal(distinct(zs(targets)), 10);

  // No two tiles share a cell.
  const cells = new Set(targets.map(({ position: p }) => `${p.x},${p.y},${p.z}`));
  assert.equal(cells.size, N);
});
