/**
 * Pure layout math. Each layout maps a tile count to an array of targets:
 *   { position: {x, y, z}, lookAt: {x, y, z} | null }
 * `lookAt` is the point a tile should face (null = face the camera, no rotation).
 * Keeping this free of three.js makes it unit-testable in Node.
 */

export const TILE_SIZE = Object.freeze({ width: 120, height: 160 });

/** 20 columns × 10 rows, filled left-to-right, top-to-bottom. */
export function tableLayout(count, { columns = 20, rows = 10, spacingX = 140, spacingY = 180 } = {}) {
  const rowCount = Math.max(rows, Math.ceil(count / columns));
  const centerCol = (columns - 1) / 2;
  const centerRow = (rowCount - 1) / 2;

  return times(count, (i) => ({
    position: {
      x: ((i % columns) - centerCol) * spacingX,
      y: -(Math.floor(i / columns) - centerRow) * spacingY,
      z: 0,
    },
    lookAt: null,
  }));
}

/** Evenly distributed points on a sphere (same spiral as the three.js demo), tiles facing outward. */
export function sphereLayout(count, { radius = 850 } = {}) {
  return times(count, (i) => {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    const position = fromSpherical(radius, phi, theta);
    return { position, lookAt: scale(position, 2) };
  });
}

/**
 * Two intertwined strands offset by 180°. Even indices go on strand A,
 * odd indices on strand B, so each "base pair" sits at the same height.
 */
export function doubleHelixLayout(count, { radius = 850, angleStep = 0.175, verticalStep = 16 } = {}) {
  const perStrand = Math.ceil(count / 2);
  const centerStep = (perStrand - 1) / 2;

  return times(count, (i) => {
    const strand = i % 2;
    const step = Math.floor(i / 2);
    const theta = step * angleStep + Math.PI + strand * Math.PI;
    const y = -(step - centerStep) * verticalStep;
    const position = fromCylindrical(radius, theta, y);
    return { position, lookAt: { x: position.x * 2, y, z: position.z * 2 } };
  });
}

/** 5 (x) × 4 (y) × 10 (z) block of tiles. */
export function gridLayout(count, { columns = 5, rows = 4, layers = 10, spacingX = 300, spacingY = 300, spacingZ = 450 } = {}) {
  const perLayer = columns * rows;
  const layerCount = Math.max(layers, Math.ceil(count / perLayer));
  const centerCol = (columns - 1) / 2;
  const centerRow = (rows - 1) / 2;
  const centerLayer = (layerCount - 1) / 2;

  return times(count, (i) => ({
    position: {
      x: ((i % columns) - centerCol) * spacingX,
      y: -(Math.floor(i / columns) % rows - centerRow) * spacingY,
      z: -(Math.floor(i / perLayer) - centerLayer) * spacingZ,
    },
    lookAt: null,
  }));
}

/** Layout registry: target builder + the camera position that frames it best. */
export const LAYOUTS = Object.freeze({
  table: { label: 'Table', build: tableLayout, camera: { x: 0, y: 0, z: 3000 } },
  sphere: { label: 'Sphere', build: sphereLayout, camera: { x: 0, y: 0, z: 3000 } },
  helix: { label: 'Helix', build: doubleHelixLayout, camera: { x: 0, y: 0, z: 4200 } },
  grid: { label: 'Grid', build: gridLayout, camera: { x: -3400, y: 1000, z: 2600 } },
});

function times(n, fn) {
  return Array.from({ length: Math.max(0, n | 0) }, (_, i) => fn(i));
}

/** Matches THREE.Vector3#setFromSphericalCoords(radius, phi, theta). */
function fromSpherical(radius, phi, theta) {
  const sinPhiRadius = Math.sin(phi) * radius;
  return {
    x: sinPhiRadius * Math.sin(theta),
    y: Math.cos(phi) * radius,
    z: sinPhiRadius * Math.cos(theta),
  };
}

/** Matches THREE.Vector3#setFromCylindricalCoords(radius, theta, y). */
function fromCylindrical(radius, theta, y) {
  return { x: radius * Math.sin(theta), y, z: radius * Math.cos(theta) };
}

function scale({ x, y, z }, k) {
  return { x: x * k, y: y * k, z: z * k };
}
