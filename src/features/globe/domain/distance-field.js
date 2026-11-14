const INF = 1e20;

// Squared distance transform of one row or column (Felzenszwalb & Huttenlocher, 2012), in place.
function transform1d(f, n, v, z, d) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) ** 2 + f[v[k]];
  }
  for (let q = 0; q < n; q++) f[q] = d[q];
}

// Euclidean distance (in cells) from every cell to the nearest cell where `inside(i)` holds.
function distanceTo(size, inside) {
  const grid = new Float64Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = inside(i) ? 0 : INF;
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) f[y] = grid[y * size + x];
    transform1d(f, size, v, z, d);
    for (let y = 0; y < size; y++) grid[y * size + x] = f[y];
  }
  for (let y = 0; y < size; y++) {
    const row = grid.subarray(y * size, (y + 1) * size);
    f.set(row);
    transform1d(f, size, v, z, d);
    row.set(f);
  }
  return grid.map(Math.sqrt);
}

/**
 * Signed distance field of a square mask: for every cell, the distance (in cells) to the shape's edge, negative
 * inside the shape and positive outside. Blending two fields cell by cell and taking where the result is below zero
 * gives a shape in between, so the edge of one shape slides smoothly into the other.
 *
 * @param {Uint8Array} mask 1 inside the shape, row by row
 * @param {number} size cells per side
 * @returns {Float32Array}
 */
export function signedDistanceField(mask, size) {
  const outside = distanceTo(size, (i) => mask[i] === 1);
  const inside = distanceTo(size, (i) => mask[i] === 0);
  const field = new Float32Array(size * size);
  // Measured between cell centres, the edge lies half a cell from either side.
  for (let i = 0; i < field.length; i++) field[i] = mask[i] ? 0.5 - inside[i] : outside[i] - 0.5;
  return field;
}
