import { signedDistanceField } from '../domain/distance-field.js';

// The polar cap the ice is drawn on: a square grid in an azimuthal equidistant projection centred on the pole,
// reaching REACH_DEG of latitude from it. 256 cells across is about 31 km a cell, fine enough for the thin bands of
// Antarctic summer ice.
const GRID = 256;
const REACH_DEG = 40;
// Just above the surface, under the lines drawn on the globe.
const ALTITUDE = 0.004;
const ICE_RGB = Object.freeze([232, 244, 255]);
const ICE_OPACITY = 0.85;
// Width (cells) of the soft edge.
const EDGE_CELLS = 1.2;
// Earlier years stay behind as a pale blue trail that blurs and fades with age, so the ice lost year after year
// builds up around the ice of this year instead of vanishing.
const TRAIL = Object.freeze({ rgb: [95, 165, 240], opacity: 0.6, decayYears: 2.5, years: 6, edgeCells: 3.5 });

/**
 * three.js classes, taken from the globe's own objects: globe.gl bundles three.js without exposing it, and loading a
 * second copy would put two three.js instances on the page.
 */
function threeClasses(globe) {
  let globeMesh = null;
  globe.scene().traverse((object) => {
    if (object.material === globe.globeMaterial()) globeMesh = object;
  });
  if (!globeMesh) throw new Error('Globe mesh not found');
  // The sphere's positions are a Float32BufferAttribute, which copies its array into floats; its parent class,
  // BufferAttribute, keeps the typed array it is given.
  const Float32Attribute = globeMesh.geometry.attributes.position.constructor;
  const parent = Object.getPrototypeOf(Float32Attribute);
  return {
    Mesh: globeMesh.constructor,
    // The sphere's geometry class, a BufferGeometry; every attribute it is created with is replaced or removed.
    Geometry: globeMesh.geometry.constructor,
    BufferAttribute: parent === Function.prototype ? Float32Attribute : parent,
    // MeshPhongMaterial, lit like the globe.
    Material: globe.globeMaterial().constructor,
  };
}

// Plane coordinates (degrees from the pole) of a longitude and latitude, and back.
function toPlane(lng, lat, pole) {
  const r = 90 - pole * lat;
  const a = (lng * Math.PI) / 180;
  return [r * Math.cos(a), pole * r * Math.sin(a)];
}

function cellLatLng(i, j, pole) {
  const x = ((j + 0.5) / GRID) * 2 * REACH_DEG - REACH_DEG;
  const y = ((i + 0.5) / GRID) * 2 * REACH_DEG - REACH_DEG;
  const r = Math.hypot(x, y);
  return { lat: pole * (90 - r), lng: (Math.atan2(pole * y, x) * 180) / Math.PI };
}

// The polygons of a geometry; a collection gives the polygons among its members, so stray points or lines beside the
// ice never hide it.
function polygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  if (geometry.type === 'GeometryCollection') return geometry.geometries.flatMap(polygons);
  return [];
}

// Rasterizes a GeoJSON (Multi)Polygon on the grid with a 2D canvas: 1 inside, 0 outside.
function mask(context, geometry, pole) {
  context.clearRect(0, 0, GRID, GRID);
  context.fillStyle = '#fff';
  context.strokeStyle = '#fff';
  // A hairline stroke closes the seams where shapes were split at the 180° meridian.
  context.lineWidth = 1.2;
  const toPixel = ([lng, lat]) => {
    const [x, y] = toPlane(lng, lat, pole);
    return [((x + REACH_DEG) / (2 * REACH_DEG)) * GRID, ((y + REACH_DEG) / (2 * REACH_DEG)) * GRID];
  };
  for (const rings of polygons(geometry)) {
    context.beginPath();
    for (const ring of rings) {
      ring.forEach((point, k) => {
        const [px, py] = toPixel(point);
        if (k === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      });
      context.closePath();
    }
    context.fill('evenodd');
    context.stroke();
  }
  const pixels = context.getImageData(0, 0, GRID, GRID).data;
  const out = new Uint8Array(GRID * GRID);
  for (let i = 0; i < out.length; i++) out[i] = pixels[i * 4 + 3] >= 128 ? 1 : 0;
  return out;
}

const poleOf = (poleLat) => Math.sign(poleLat) || 1;

/**
 * The signed distance fields of each track's years of ice, made once per track and kept. Making them takes a while,
 * so `prepare` makes them a year at a time between other work, before the track is shown; `get` finishes any left.
 */
export function createIceFields() {
  const canvas = document.createElement('canvas');
  canvas.width = GRID;
  canvas.height = GRID;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  /** @type {Map<string, { pole: number, shapes: (object | null)[], fields: Float32Array[] }>} */
  const tracks = new Map();

  const field = (track) => signedDistanceField(mask(context, track.shapes[track.fields.length], track.pole), GRID);

  function entry({ key, poleLat, shapes }) {
    if (!tracks.has(key)) tracks.set(key, { pole: poleOf(poleLat), shapes, fields: [] });
    return tracks.get(key);
  }

  /** @param {{ key: string, poleLat: number, shapes: (object | null)[] }} view */
  function prepare(view) {
    const track = entry(view);
    const next = () => {
      if (track.fields.length >= track.shapes.length) return;
      track.fields.push(field(track));
      setTimeout(next);
    };
    setTimeout(next);
  }

  /**
   * @param {{ key: string, poleLat: number, shapes: (object | null)[] }} view
   * @returns {Float32Array[]} one field a year
   */
  function get(view) {
    const track = entry(view);
    while (track.fields.length < track.shapes.length) track.fields.push(field(track));
    return track.fields;
  }

  return { prepare, get };
}

/**
 * Sea ice drawn as a soft-edged layer over a pole that morphs from one year's shape into the next: each year's ice
 * becomes a signed distance field, and any moment in between blends the two fields, so the ice edge slides instead
 * of jumping. Pieces too thin to morph fade in. Earlier years stay behind as a fading blue trail, so the ice that was
 * lost shows around the ice that is left.
 *
 * @param {object} globe a globe.gl instance
 * @param {ReturnType<typeof createIceFields>} iceFields where each track's fields are made and kept
 */
export function createIceMorph(globe, iceFields) {
  const THREE = threeClasses(globe);
  // One vertex at the centre of every cell, so each reads its own cell of the fields.
  const count = GRID * GRID;
  const index = [];
  for (let i = 0; i < GRID - 1; i++) {
    for (let j = 0; j < GRID - 1; j++) {
      const a = i * GRID + j;
      const b = a + GRID;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  // One grid for each pole, built once and kept, so moving between tracks builds nothing.
  /** @type {Map<number, object>} */
  const meshes = new Map();
  let mesh = null;
  let series = null;
  let shownAt = null;
  const colors = new Uint8Array(count * 4);

  // The grid laid on the sphere over one pole.
  function build(pole) {
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const { lat, lng } = cellLatLng(i, j, pole);
        const { x, y, z } = globe.getCoords(lat, lng, ALTITUDE);
        const length = Math.hypot(x, y, z);
        positions.set([x, y, z], (i * GRID + j) * 3);
        normals.set([x / length, y / length, z / length], (i * GRID + j) * 3);
      }
    }
    const geometry = new THREE.Geometry();
    for (const name of Object.keys(geometry.attributes)) geometry.deleteAttribute(name);
    geometry.setIndex(index);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4, true));
    geometry.computeBoundingSphere();
    const material = new THREE.Material({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      shininess: 0,
      // THREE.DoubleSide: the grid's winding differs between the poles.
      side: 2,
    });
    // Unlit: the ice and its trail show exactly their own colours, as a map legend would, instead of being greyed by
    // the globe's ambient light.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(/vec3 outgoingLight = [^;]+;/, 'vec3 outgoingLight = diffuseColor.rgb;');
    };
    const next = new THREE.Mesh(geometry, material);
    next.renderOrder = 1;
    return next;
  }

  /** Builds the grid over the pole at `poleLat` ahead of showing it. */
  function prepare(poleLat) {
    const pole = poleOf(poleLat);
    if (meshes.has(pole)) return meshes.get(pole);
    const next = build(pole);
    next.visible = false;
    globe.scene().add(next);
    meshes.set(pole, next);
    return next;
  }

  // Share of a cell covered, from its signed distance to the edge, for an edge `edge` cells wide.
  const cover = (d, edge) => Math.min(1, Math.max(0, 0.5 - d / edge));

  function paint(at) {
    const { fields } = series;
    const from = Math.max(0, Math.min(fields.length - 1, Math.floor(at)));
    const to = Math.min(fields.length - 1, from + 1);
    const t = Math.min(1, Math.max(0, at - from));
    const a = fields[from];
    const b = fields[to];
    // The trail: each earlier year (and the one this year grows out of), fainter the longer ago it was.
    const trail = [];
    for (let k = from; k >= Math.max(0, from - TRAIL.years); k--) {
      trail.push({ field: fields[k], opacity: TRAIL.opacity * Math.exp(-(at - k) / TRAIL.decayYears) });
    }
    const [iceR, iceG, iceB] = ICE_RGB;
    const [trailR, trailG, trailB] = TRAIL.rgb;
    for (let v = 0; v < count; v++) {
      // This year's ice: blending the fields slides the edge from last year's shape. Thin pieces that do not overlap
      // from one year to the next would vanish halfway through the blend, so this year's also fades in.
      const ice = Math.max(cover(a[v] + (b[v] - a[v]) * t, EDGE_CELLS), t * cover(b[v], EDGE_CELLS)) * ICE_OPACITY;
      let past = 0;
      for (const { field, opacity } of trail) past = Math.max(past, cover(field[v], TRAIL.edgeCells) * opacity);
      // The stronger layer shows; where the trail is stronger, the colour turns towards its blue.
      const alpha = Math.max(ice, past);
      const share = alpha > 0 ? ice / alpha : 1;
      const o = v * 4;
      colors[o] = trailR + (iceR - trailR) * share;
      colors[o + 1] = trailG + (iceG - trailG) * share;
      colors[o + 2] = trailB + (iceB - trailB) * share;
      colors[o + 3] = Math.round(alpha * 255);
    }
    mesh.geometry.attributes.color.needsUpdate = true;
  }

  /**
   * Shows a track's ice at `at`, a position in its years: 3 is the fourth year, 3.5 halfway into the fifth.
   * A new `key` builds the track's fields once. Pass null to hide.
   *
   * @param {{ key: string, poleLat: number, shapes: (object | null)[], at: number } | null} view
   *   shapes: GeoJSON geometry of each year's ice, in order
   */
  function show(view) {
    if (!view) {
      if (mesh) mesh.visible = false;
      return;
    }
    if (series?.key !== view.key) {
      const pole = poleOf(view.poleLat);
      if (series?.pole !== pole) {
        if (mesh) mesh.visible = false;
        mesh = prepare(view.poleLat);
      }
      series = { key: view.key, pole, fields: iceFields.get(view) };
      shownAt = null;
    }
    mesh.visible = true;
    if (view.at !== shownAt) {
      shownAt = view.at;
      paint(view.at);
    }
  }

  /**
   * Where ice was lost between two years of the track shown: up to `max` cells that were ice in year `from` and are
   * not in year `to`, spread over the loss, and the net loss in cells: cells lost less cells gained, 0 when the ice
   * grew (one cell is about 1,000 km²).
   *
   * @param {number} from
   * @param {number} to
   * @param {number} max
   * @returns {{ count: number, points: { lat: number, lng: number }[] }}
   */
  function lost(from, to, max) {
    if (!series || !series.fields[from] || !series.fields[to]) return { count: 0, points: [] };
    const before = series.fields[from];
    const after = series.fields[to];
    const cells = [];
    let gained = 0;
    for (let v = 0; v < count; v++) {
      if (before[v] < 0 && after[v] >= 0) cells.push(v);
      else if (before[v] >= 0 && after[v] < 0) gained++;
    }
    const step = Math.max(1, cells.length / max);
    const points = [];
    for (let k = 0; k < cells.length && points.length < max; k += step) {
      const v = cells[Math.floor(k)];
      points.push(cellLatLng(Math.floor(v / GRID), v % GRID, series.pole));
    }
    return { count: Math.max(0, cells.length - gained), points };
  }

  return { prepare, show, lost };
}
