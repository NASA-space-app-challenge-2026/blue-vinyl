// A forest track on the globe: the GEDI canopy map as trees, big and small, lit by the noon sun, a CO₂ field floating above it
// as a faint haze (warmer as the air of GEDI's four years thickens), the noon meridian moving west, and a note of light wherever
// the music strikes one: each forest voice glows at the forest it is playing, in its own colour, and lets a few motes
// of pollen rise from there.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { BAND_LATS, Band, LINE_STEPS, airAt, lineLonAt, lineStepAt } from '../../tracks/domain/noon-line.js';
import { forestNotesAt } from '../../music/domain/composers/noon.js';
import { createGrowingTree } from './tree-sprites.js';

// Canopy PNG is 0.25°.
const MAP_CELL_DEG = 0.25;
// The forest stands as one tree on each 2° square of the map where at least a quarter of the square is forest. The
// tree is as tall as the square's tall canopy (90th percentile of its forest cells).
const TREE = Object.freeze({ cellDeg: 2, minForestShare: 0.25, percentile: 0.9 });
// Big tree, small tree: a tree's size on the map (globe units, radius 100) grows with its height from 4 m to 40 m and
// over, so the tallest forests stand out far across the globe.
const TREE_SIZE = Object.freeze({ fromM: 4, fullM: 40, smallestU: 13, tallestU: 50 });
// Each height class its own colour and its own tree: the commonest, the lowest, is plain green; each class up is
// brighter and branches more generations deep, so it glows more, up to gold. Colours are sRGB, as picked.
const TreeKind = Object.freeze({
  GREEN: Object.freeze({ fromM: 4, color: '#2f8f46', depth: 4 }),
  TEAL: Object.freeze({ fromM: 8, color: '#22a99a', depth: 5 }),
  SKY: Object.freeze({ fromM: 14, color: '#79c7ee', depth: 6 }),
  SILVER: Object.freeze({ fromM: 20, color: '#e6edf5', depth: 7 }),
  GOLD: Object.freeze({ fromM: 28, color: '#f4c34a', depth: 8 }),
});
const TREE_KINDS = Object.values(TreeKind);
// Only some trees grow: picked at random, the taller likelier (`tallBias`), and no two closer than `spacing` times
// the mean of their sizes, so the forest stays open. Each grows `afterSteps` after the noon line has crossed it.
const TREE_PICK = Object.freeze({ tallBias: 3, spacing: 0.8, afterSteps: [1, 10] });
// A tree takes from `shortest` (the lowest kind) to `longest` (the tallest) to reach its tips.
const TREE_GROWTH = Object.freeze({ shortest: 0.6, longest: 1.5 });
// Each tree's canvas: the smaller kinds at the first size, the taller at the second (pixels, a power of two).
const TREE_CANVAS_PX = Object.freeze([256, 512]);
// The tree's base in its sprite (share of the sprite, from the bottom left), as tree-sprites.js plants it.
const TREE_BASE = Object.freeze({ x: 0.5, y: 0.015 });
const MAP_NORTH = 52;
const MAP_SOUTH = -52;
const MERIDIAN_SAMPLES = 96;
const MERIDIAN_ALTITUDE = 0.006;
const MERIDIAN_HALF_DEG = 0.7;
// Notes of light: points drawn on the GPU from one fixed pool, each fading out where it was struck (it does not slide
// along with the meridian). Sizes and speeds in globe units (radius 100).
const LIGHT_POOL = 2048;
// The forest a voice plays: the band's cells under the degree of the step, at least this tall (m; as noon-line.js).
const SOUNDING_FROM_M = 4;
// The glow where a note is struck: bigger the higher and louder the note (share 0..1).
const NOTE_GLOW = Object.freeze({ life: 0.9, size: [5, 11], grow: 1.7 });
// Motes of pollen rising from the forest the note plays, more the louder it is.
const MOTE = Object.freeze({ count: [2, 5], life: [1.6, 2.8], size: [2.5, 4.5], rise: [3, 6], drift: 3, sway: 1.2, grow: 0.45 });
// Each voice in its own colour, so the eye can follow the ear: the north's flute cool, the tropics' lead gold, the
// south's pizzicato rose. The warm light is every glow's heart.
const VOICE_COLORS = Object.freeze({
  [Band.NORTH]: '#7fd0ff',
  [Band.TROPICS]: '#ffc94d',
  [Band.SOUTH]: '#ff8fb1',
});
const LIGHT_HEART = '#fff1cf';
// Steps a frame may jump and still have each one's notes shown (more is a seek).
const MAX_STEPS_A_FRAME = 4;
// CO₂ map is 1°, the mean of GEDI's window; the range it is coloured over (ppm), round that window's spread.
const AIR_CELL_DEG = 1;
const AIR_PPM = Object.freeze({ low: 409, high: 418 });
const AIR_ALT = Object.freeze({ low: 0.014, high: 0.04 });
const AIR_FOOTPRINT = 0.92;

const airVertex = `
attribute float aShare;
varying float vShare;
varying float vAcross;
void main() {
  vShare = aShare;
  vAcross = max(abs(position.x), abs(position.y));
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;

const airFragment = `
uniform float uAirThick;
varying float vShare;
varying float vAcross;
void main() {
  // The window's thinnest month: a faint cool veil. Its thickest: a warmer, denser one, still thin enough to see the
  // forest through.
  // Colours are sRGB, as picked; the shader works in linear light.
  vec3 cool = pow(vec3(0.42, 0.62, 0.95), vec3(2.2));
  vec3 warm = pow(vec3(1.0, 0.52, 0.36), vec3(2.2));
  float thick = clamp(uAirThick, 0.0, 1.0);
  vec3 color = mix(cool, warm, mix(vShare * 0.35, 0.55 + vShare * 0.45, thick));
  float edge = 1.0 - smoothstep(0.3, 0.5, vAcross);
  float alpha = edge * mix(0.05, 0.22, thick) * mix(0.6, 1.0, vShare);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}`;

const meridianVertex = `
varying float vAlong;
varying float vAcross;
void main() {
  vAlong = uv.y;
  vAcross = uv.x * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const meridianFragment = `
uniform vec3 uColor;
varying float vAlong;
varying float vAcross;
void main() {
  float edge = 1.0 - abs(vAcross);
  float core = pow(edge, 6.0);
  float fade = smoothstep(0.0, 0.08, vAlong) * smoothstep(1.0, 0.92, vAlong);
  float alpha = fade * (0.35 * edge * edge + 0.65 * core);
  gl_FragColor = vec4(mix(uColor, vec3(1.0), core * 0.7), alpha);
  #include <colorspace_fragment>
}`;

const lightVertex = `
attribute vec3 aDrift;
attribute vec3 aSway;
attribute vec3 aColor;
attribute vec4 aLife; // born (s), life (s), size (units), grow (size at the end, as a share)
attribute vec2 aLook; // attack (share of the life it takes to come up), seed
uniform float uTime;
uniform float uPxPerUnit;
varying float vAlpha;
varying vec3 vColor;
void main() {
  float t = uTime - aLife.x;
  float u = t / aLife.y;
  if (u < 0.0 || u > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  // Rises and slows, swaying a little side to side like something carried on warm air (a glow has no drift).
  vec3 p = position + aDrift * t * (1.0 - 0.4 * u) + aSway * sin(t * 2.4 + aLook.y * 6.283);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float ease = 1.0 - (1.0 - u) * (1.0 - u);
  gl_PointSize = aLife.z * mix(1.0, aLife.w, ease) * uPxPerUnit / -mv.z;
  // Struck: up fast, then dies away like the note.
  vAlpha = smoothstep(0.0, aLook.x, u) * (1.0 - u) * (1.0 - u);
  vColor = aColor;
}`;

const lightFragment = `
uniform vec3 uHeart;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d) * 4.0;
  if (r2 > 1.0) discard;
  // A small warm heart in a soft glow of the voice's colour, faded to nothing at the rim so no edge shows.
  float heart = exp(-r2 * 20.0);
  float glow = exp(-r2 * 4.5) * (1.0 - r2);
  gl_FragColor = vec4((uHeart * heart * 1.3 + vColor * glow * 0.75) * vAlpha, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * The forest a band plays at a step: its cells on the canopy map under the step's degree of longitude, as { lat, lon,
 * height }, and their centre, weighted toward the tallest (where the note is heard from). Null where it has none.
 */
function bandForest(map, band, lineStep) {
  const { width, height, metres } = map;
  const east = lineLonAt(lineStep);
  const [south, north] = BAND_LATS[band];
  const c0 = Math.round((east - 1 + 180) / MAP_CELL_DEG);
  const r0 = Math.max(0, Math.round((MAP_NORTH - north) / MAP_CELL_DEG));
  const r1 = Math.min(height, Math.round((MAP_NORTH - south) / MAP_CELL_DEG));
  const cells = [];
  let weight = 0;
  let lat = 0;
  let lon = 0;
  for (let c = c0; c < c0 + 1 / MAP_CELL_DEG; c++) {
    const col = ((c % width) + width) % width;
    for (let row = r0; row < r1; row++) {
      const h = metres[row * width + col];
      if (!(h >= SOUNDING_FROM_M)) continue;
      const cell = { lat: MAP_NORTH - (row + 0.5) * MAP_CELL_DEG, lon: -180 + (col + 0.5) * MAP_CELL_DEG, height: h };
      cells.push(cell);
      const w = h * h;
      weight += w;
      lat += cell.lat * w;
      lon += cell.lon * w;
    }
  }
  if (!cells.length) return null;
  return { cells, lat: lat / weight, lon: lon / weight };
}

const between = ([low, high], share = Math.random()) => low + share * (high - low);

/** A tree's size on the map (globe units) for its height in metres. */
function treeSizeU(metres) {
  const share = Math.min(1, Math.max(0, (metres - TREE_SIZE.fromM) / (TREE_SIZE.fullM - TREE_SIZE.fromM)));
  return TREE_SIZE.smallestU + share * (TREE_SIZE.tallestU - TREE_SIZE.smallestU);
}

/** The TreeKind of a tree `metres` tall: the tallest class it reaches. */
function treeKindOf(metres) {
  return TREE_KINDS.findLast((kind) => metres >= kind.fromM) ?? TREE_KINDS[0];
}

/**
 * How lit a tree is by the noon sun over the line at `lineLon`: full light under it at the equator, falling to dusk
 * a quarter of the way round.
 */
function sunAt(lat, lon, lineLon) {
  const d = Math.abs(((lon - lineLon + 540) % 360) - 180);
  const sun = Math.cos((lat * Math.PI) / 180) * Math.cos((Math.min(d, 90) * Math.PI) / 180);
  return 0.32 + 0.68 * Math.max(sun, 0) ** 0.8;
}

/** The trees that grow on the globe, picked from the map's (TREE_PICK), each with the step it starts growing at. */
function pickTrees(map) {
  const unitsPerDeg = (100 * Math.PI) / 180;
  const sizeDeg = (metres) => treeSizeU(metres) / unitsPerDeg;
  const shareOf = (metres) => (treeSizeU(metres) - TREE_SIZE.smallestU) / (TREE_SIZE.tallestU - TREE_SIZE.smallestU);
  // A weighted random order: the taller a tree, the likelier it comes early.
  const order = mapTrees(map)
    .map((tree) => ({ tree, key: Math.random() ** (1 / (1 + TREE_PICK.tallBias * shareOf(tree.metres))) }))
    .sort((a, b) => b.key - a.key)
    .map(({ tree }) => tree);
  const picked = [];
  for (const tree of order) {
    const crowded = picked.some((other) => arcDeg(tree, other) < ((sizeDeg(tree.metres) + sizeDeg(other.metres)) / 2) * TREE_PICK.spacing);
    if (crowded) continue;
    picked.push({ ...tree, startStep: lineStepAt(tree.lon) + between(TREE_PICK.afterSteps), seed: Math.floor(Math.random() * 1e9) });
  }
  return picked;
}

/** The angle between two places on the globe (degrees). */
function arcDeg(a, b) {
  const rad = Math.PI / 180;
  const cos = Math.sin(a.lat * rad) * Math.sin(b.lat * rad) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((a.lon - b.lon) * rad);
  return Math.acos(Math.min(1, Math.max(-1, cos))) / rad;
}

/** The trees of the canopy map: one per TREE.cellDeg square that is forest enough, as { lat, lon, metres }. */
function mapTrees(map) {
  const { width, height, metres } = map;
  const span = Math.round(TREE.cellDeg / MAP_CELL_DEG);
  const trees = [];
  for (let r0 = 0; r0 < height; r0 += span) {
    for (let c0 = 0; c0 < width; c0 += span) {
      const forest = [];
      for (let row = r0; row < Math.min(height, r0 + span); row++) {
        for (let col = c0; col < Math.min(width, c0 + span); col++) {
          const h = metres[row * width + col];
          if (h >= SOUNDING_FROM_M) forest.push(h);
        }
      }
      if (forest.length < TREE.minForestShare * span * span) continue;
      forest.sort((a, b) => a - b);
      trees.push({
        lat: MAP_NORTH - (r0 + span / 2) * MAP_CELL_DEG,
        lon: -180 + (c0 + span / 2) * MAP_CELL_DEG,
        metres: forest[Math.min(forest.length - 1, Math.floor(TREE.percentile * forest.length))],
      });
    }
  }
  return trees;
}

/**
 * @param {{ globe: Object, unitsPerPx: () => number, setElements: (elements: Object[]) => void }} view
 */
export function createNoonLayer(view) {
  let trees = [];
  let airMesh = null;
  let meridian = null;
  let canopyMap = null;
  let lights = null;
  let nextLight = 0;
  let lastNoteStep = null;
  let growFrame = 0;

  function disposeMesh(m) {
    if (!m) return;
    view.globe.scene().remove(m);
    m.geometry.dispose();
    m.material.dispose();
  }

  /** Takes the forest and air off the globe and, for `song`, puts them and the noon meridian on. */
  function reset(song, color) {
    for (const tree of trees) unplant(tree);
    trees = [];
    disposeMesh(airMesh);
    disposeMesh(meridian);
    disposeMesh(lights);
    airMesh = meridian = lights = null;
    canopyMap = null;
    nextLight = 0;
    lastNoteStep = null;
    view.setElements([]);
    if (!song) return;
    canopyMap = song.map;
    trees = pickTrees(song.map);
    airMesh = buildAir(song.airMap);
    view.globe.scene().add(airMesh);
    meridian = buildMeridian(color);
    view.globe.scene().add(meridian);
    lights = buildLights();
    view.globe.scene().add(lights);
  }

  function buildLights() {
    const geometry = new THREE.BufferGeometry();
    const attribute = (size) => new THREE.BufferAttribute(new Float32Array(LIGHT_POOL * size), size).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', attribute(3));
    geometry.setAttribute('aDrift', attribute(3));
    geometry.setAttribute('aSway', attribute(3));
    geometry.setAttribute('aColor', attribute(3));
    geometry.setAttribute('aLife', attribute(4));
    geometry.setAttribute('aLook', attribute(2));
    // Every slot starts dead (born far in the past).
    const life = geometry.attributes.aLife.array;
    for (let i = 0; i < LIGHT_POOL; i++) life.set([-1e6, 1, 0, 1], i * 4);
    const material = new THREE.ShaderMaterial({
      vertexShader: lightVertex,
      fragmentShader: lightFragment,
      uniforms: {
        uTime: { value: 0 },
        uPxPerUnit: { value: 1 },
        uHeart: { value: new THREE.Color(LIGHT_HEART) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 5;
    return points;
  }

  /**
   * Lights one point over the forest at `lat`, `lon`: a glow where it stands still (`rises` false), or a mote of pollen
   * drifting up.
   */
  function light({ lat, lon, color, now, life, size, grow, attack, rises }) {
    const { x, y, z } = view.globe.getCoords(lat, lon, MERIDIAN_ALTITUDE);
    const i = nextLight;
    nextLight = (nextLight + 1) % LIGHT_POOL;
    const { attributes } = lights.geometry;
    let drift = [0, 0, 0];
    let sway = [0, 0, 0];
    if (rises) {
      const up = new THREE.Vector3(x, y, z).normalize();
      const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), up).normalize();
      const north = new THREE.Vector3().crossVectors(up, east);
      const angle = Math.random() * Math.PI * 2;
      const tangent = east.multiplyScalar(Math.cos(angle)).add(north.multiplyScalar(Math.sin(angle)));
      drift = up.clone().multiplyScalar(between(MOTE.rise)).addScaledVector(tangent, MOTE.drift * Math.random()).toArray();
      sway = tangent.clone().cross(up).multiplyScalar(MOTE.sway).toArray();
    }
    attributes.position.array.set([x, y, z], i * 3);
    attributes.aDrift.array.set(drift, i * 3);
    attributes.aSway.array.set(sway, i * 3);
    attributes.aColor.array.set([color.r, color.g, color.b], i * 3);
    attributes.aLife.array.set([now, life, size, grow], i * 4);
    attributes.aLook.array.set([attack, Math.random()], i * 2);
    for (const name of ['position', 'aDrift', 'aSway', 'aColor', 'aLife', 'aLook']) attributes[name].needsUpdate = true;
  }

  const voiceColors = Object.fromEntries(Object.entries(VOICE_COLORS).map(([band, hex]) => [band, new THREE.Color(hex)]));

  /** The notes the forest voices strike at a whole step of the line, each lit where its band's forest is. */
  function lightNotes(line, lineStep, now) {
    for (const note of forestNotesAt(line, lineStep)) {
      const forest = bandForest(canopyMap, note.band, lineStep);
      if (!forest) continue;
      const color = voiceColors[note.band];
      // The note: a glow at the heart of the forest it plays, as big as it is high and loud.
      light({
        lat: forest.lat, lon: forest.lon, color, now,
        life: NOTE_GLOW.life, size: between(NOTE_GLOW.size, note.share), grow: NOTE_GLOW.grow, attack: 0.06, rises: false,
      });
      // Pollen from the forest itself, the taller cells likelier.
      const motes = Math.round(between(MOTE.count, note.share));
      for (let tries = 0, made = 0; made < motes && tries < motes * 8; tries++) {
        const cell = forest.cells[Math.floor(Math.random() * forest.cells.length)];
        if (Math.random() > cell.height / 35) continue;
        light({
          lat: cell.lat, lon: cell.lon, color, now,
          life: between(MOTE.life), size: between(MOTE.size), grow: MOTE.grow, attack: 0.15, rises: true,
        });
        made++;
      }
    }
  }

  function updateLightScale() {
    const camera = view.globe.camera();
    const height = view.globe.renderer().getDrawingBufferSize(new THREE.Vector2()).y;
    lights.material.uniforms.uPxPerUnit.value = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }

  /**
   * Starts `tree` growing where it stands: its own canvas (tree-sprites.js), drawn frame by frame, on a sprite standing
   * upright on the screen and added onto the globe like light.
   */
  function plant(tree) {
    const kindIndex = TREE_KINDS.indexOf(treeKindOf(tree.metres));
    const kind = TREE_KINDS[kindIndex];
    const share = kindIndex / (TREE_KINDS.length - 1);
    tree.grower = createGrowingTree({
      color: kind.color,
      depth: kind.depth,
      growSec: TREE_GROWTH.shortest + share * (TREE_GROWTH.longest - TREE_GROWTH.shortest),
      sizePx: TREE_CANVAS_PX[share > 0.5 ? 1 : 0],
      seed: tree.seed,
    });
    const texture = new THREE.CanvasTexture(tree.grower.canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Mipmapped, so a tree drawn small stays smooth as the globe turns.
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const { x, y, z } = view.globe.getCoords(tree.lat, tree.lon, MERIDIAN_ALTITUDE);
    sprite.position.set(x, y, z);
    sprite.center.set(TREE_BASE.x, TREE_BASE.y);
    const size = treeSizeU(tree.metres);
    sprite.scale.set(size, size, 1);
    sprite.renderOrder = 1;
    tree.sprite = sprite;
    tree.growing = true;
    view.globe.scene().add(sprite);
    growTrees();
  }

  function unplant(tree) {
    if (!tree.sprite) return;
    view.globe.scene().remove(tree.sprite);
    tree.sprite.material.map.dispose();
    tree.sprite.material.dispose();
    tree.sprite = tree.grower = null;
    tree.growing = false;
  }

  /** Draws the growing trees frame by frame until every planted tree is grown. */
  function growTrees() {
    if (growFrame) return;
    const frame = () => {
      const now = performance.now() / 1000;
      let any = false;
      for (const tree of trees) {
        if (!tree.growing) continue;
        tree.growing = tree.grower.step(now);
        tree.sprite.material.map.needsUpdate = true;
        any ||= tree.growing;
      }
      growFrame = any ? requestAnimationFrame(frame) : 0;
    };
    growFrame = requestAnimationFrame(frame);
  }

  function buildAir(airMap) {
    const { width, height, ppm } = airMap;
    const cells = [];
    const span = AIR_PPM.high - AIR_PPM.low;
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const value = ppm[row * width + col];
        if (!(value > 0)) continue;
        const share = Math.min(1, Math.max(0, (value - AIR_PPM.low) / span));
        cells.push({
          lat: 90 - (row + 0.5) * AIR_CELL_DEG,
          lon: -180 + (col + 0.5) * AIR_CELL_DEG,
          share,
          alt: AIR_ALT.low + share * (AIR_ALT.high - AIR_ALT.low),
        });
      }
    }
    const n = cells.length;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: airVertex,
      fragmentShader: airFragment,
      uniforms: { uAirThick: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const field = new THREE.InstancedMesh(geometry, material, n);
    const unitsPerDeg = (view.globe.getGlobeRadius() * Math.PI) / 180;
    const widthM = AIR_CELL_DEG * AIR_FOOTPRINT * unitsPerDeg;
    const pole = new THREE.Vector3(0, 1, 0);
    const up = new THREE.Vector3();
    const east = new THREE.Vector3();
    const north = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const shares = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const cell = cells[i];
      const { x, y, z } = view.globe.getCoords(cell.lat, cell.lon, cell.alt);
      up.set(x, y, z).normalize();
      east.crossVectors(pole, up).normalize();
      if (east.lengthSq() < 1e-8) east.set(1, 0, 0).addScaledVector(up, -up.x).normalize();
      north.crossVectors(up, east);
      const across = widthM * Math.cos((cell.lat * Math.PI) / 180);
      matrix.makeBasis(east.multiplyScalar(across), north.multiplyScalar(widthM), up.clone());
      matrix.setPosition(x, y, z);
      field.setMatrixAt(i, matrix);
      shares[i] = cell.share;
    }
    geometry.setAttribute('aShare', new THREE.InstancedBufferAttribute(shares, 1));
    field.frustumCulled = false;
    field.renderOrder = 2;
    return field;
  }

  function buildMeridian(color) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MERIDIAN_SAMPLES * 2 * 3);
    const uvs = new Float32Array(MERIDIAN_SAMPLES * 2 * 2);
    const index = new Uint32Array((MERIDIAN_SAMPLES - 1) * 6);
    for (let i = 0; i < MERIDIAN_SAMPLES; i++) {
      const t = i / (MERIDIAN_SAMPLES - 1);
      uvs.set([0, t, 1, t], i * 4);
    }
    for (let i = 0; i < MERIDIAN_SAMPLES - 1; i++) {
      const a = 2 * i;
      index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: meridianVertex,
      fragmentShader: meridianFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const ribbon = new THREE.Mesh(geometry, material);
    ribbon.frustumCulled = false;
    ribbon.visible = false;
    ribbon.renderOrder = 3;
    ribbon.userData.positions = positions;
    return ribbon;
  }

  function placeMeridian(lon) {
    const positions = meridian.userData.positions;
    const radius = view.globe.getGlobeRadius();
    const half = MERIDIAN_HALF_DEG * (Math.PI / 180) * radius;
    for (let i = 0; i < MERIDIAN_SAMPLES; i++) {
      const lat = MAP_SOUTH + ((MAP_NORTH - MAP_SOUTH) * i) / (MERIDIAN_SAMPLES - 1);
      const { x, y, z } = view.globe.getCoords(lat, lon, MERIDIAN_ALTITUDE);
      const up = new THREE.Vector3(x, y, z).normalize();
      const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), up).normalize();
      if (!Number.isFinite(east.x) || east.lengthSq() < 1e-8) {
        east.set(1, 0, 0).addScaledVector(up, -up.x).normalize();
      }
      positions.set([
        x - east.x * half, y - east.y * half, z - east.z * half,
        x + east.x * half, y + east.y * half, z + east.z * half,
      ], i * 6);
    }
    meridian.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * @param {{ map: Object, airMap: Object, air: import('../../tracks/domain/noon-line.js').AirMonths, line: Object }} song
   * @param {number} step
   * @param {boolean} [playing]  whether the music is playing, so notes are heard and lit
   */
  function render(song, step, playing = false) {
    if (!meridian) return;
    // The noon line moves from the first step; the listening legend does not hold it back.
    const lineStep = Math.max(0, Math.min(LINE_STEPS, step));
    const headLon = lineLonAt(lineStep);
    // A picked tree grows once the line has crossed it, and is gone again if the music goes back before that.
    for (const tree of trees) {
      if (!tree.sprite && lineStep >= tree.startStep) plant(tree);
      else if (tree.sprite && lineStep < tree.startStep) unplant(tree);
      if (tree.sprite) tree.sprite.material.color.setScalar(sunAt(tree.lat, tree.lon, headLon));
    }
    if (airMesh) airMesh.material.uniforms.uAirThick.value = airAt(song.air, lineStep).thickness;
    placeMeridian(headLon);
    meridian.visible = true;

    // A note sounds at the start of its step (composers/noon.js plays step n at n steps in), so it lights then too.
    const now = performance.now() / 1000;
    const stepInt = Math.floor(lineStep);
    if (!playing) {
      lastNoteStep = null;
    } else if (canopyMap && song.line && stepInt !== lastNoteStep) {
      const ahead = lastNoteStep !== null && stepInt > lastNoteStep && stepInt - lastNoteStep <= MAX_STEPS_A_FRAME;
      for (let s = ahead ? lastNoteStep + 1 : stepInt; s <= stepInt; s++) lightNotes(song.line, s, now);
      lastNoteStep = stepInt;
    }
    lights.material.uniforms.uTime.value = now;
    updateLightScale();
  }

  return { reset, render };
}
