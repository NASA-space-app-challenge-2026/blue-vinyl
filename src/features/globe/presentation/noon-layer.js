// A forest track on the globe: the GEDI canopy map as trees, big and small, lit by the noon sun, a CO₂ field floating above it
// as a faint haze (warmer as the air of GEDI's four years thickens), the noon meridian moving west, and a note of light wherever
// the music strikes one: each forest voice glows at the forest it is playing, in its own colour, and lets a few motes
// of pollen rise from there.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { BAND_LATS, Band, LINE_STEPS, airAt, lineLonAt } from '../../tracks/domain/noon-line.js';
import { forestNotesAt } from '../../music/domain/composers/noon.js';
import { createTreeGrower } from './tree-sprites.js';

// Canopy PNG is 0.25°.
const MAP_CELL_DEG = 0.25;
// The forest stands as one tree on each 2° square of the map where at least a quarter of the square is forest. The
// tree is as tall as the square's tall canopy (90th percentile of its forest cells).
const TREE = Object.freeze({ cellDeg: 2, minForestShare: 0.25, percentile: 0.9 });
// Big tree, small tree: a tree's size on the map (globe units, radius 100) grows with its height from 4 m to 40 m and
// over, so the tallest forests stand out over several squares before the noon line reaches them.
const TREE_SIZE = Object.freeze({ fromM: 4, fullM: 40, smallestU: 2.6, tallestU: 10 });
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
// Trees of a kind come in this many variants, each its own cell of the growing canvas (tree-sprites.js).
const TREE_VARIANTS = 4;
const TREE_CELL_PX = 256;
// Growing when the album opens: the variants start spread over `stagger` seconds, and a kind's trees take from
// `shortest` (the lowest kind) to `longest` (the tallest) to reach their tips.
const TREE_GROWTH = Object.freeze({ stagger: 1.5, shortest: 1.5, longest: 4 });
// The tree's base sits this far below the sprite's centre (share of its size), as tree-sprites.js plants it.
const TREE_BASE_BELOW = 0.48;
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

// Trees as sprites standing upright on the screen, each reading its kind's and variant's cell of the growing canvas,
// added onto the globe like light.
const treeVertex = `
attribute vec3 aColor;
attribute vec2 aCell; // kind, variant
attribute float aSize;
attribute float aLon;
attribute float aLat;
uniform float uPxPerUnit;
uniform float uBufferHeight;
uniform float uLineLon;
uniform float uHighlight;
varying vec3 vColor;
varying vec2 vCell;
varying float vSun;
varying float vLit;
void main() {
  vColor = aColor;
  vCell = aCell;
  float d = abs(mod(aLon - uLineLon + 540.0, 360.0) - 180.0);
  // The noon sun stands over the line at the equator: full light there, falling to dusk a quarter of the way round.
  float sun = cos(radians(aLat)) * cos(radians(min(d, 90.0)));
  vSun = 0.32 + 0.68 * pow(max(sun, 0.0), 0.8);
  // A tree is caught in warm noon light while the line crosses it, longer the wider it is.
  float halfDeg = aSize * 0.3 / (${(Math.PI / 180).toFixed(6)} * 100.0) / max(cos(radians(aLat)), 0.2);
  vLit = uHighlight * (1.0 - smoothstep(halfDeg * 0.5, halfDeg, d));
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float px = aSize * uPxPerUnit / -mv.z;
  gl_PointSize = px;
  // Stand the tree on its place: lift the sprite so its base, not its centre, is there.
  gl_Position.y += 2.0 * ${TREE_BASE_BELOW.toFixed(2)} * px / uBufferHeight * gl_Position.w;
}`;

const treeFragment = `
uniform sampler2D uTrees;
varying vec3 vColor;
varying vec2 vCell;
varying float vSun;
varying float vLit;
void main() {
  vec2 uv = vec2(
    (vCell.x + gl_PointCoord.x) / ${TREE_KINDS.length.toFixed(1)},
    1.0 - (vCell.y + gl_PointCoord.y) / ${TREE_VARIANTS.toFixed(1)}
  );
  float glow = texture2D(uTrees, uv).r;
  if (glow < 0.01) discard;
  // Neon: the kind's colour where the light is thin, burning to white where branches cross and at the trunk.
  vec3 color = mix(vColor, vec3(1.0), smoothstep(0.6, 1.0, glow)) * glow * 1.6 * vSun;
  // Under the line itself the trees are caught in warm noon light (sRGB, as picked; the shader works in linear light).
  color += pow(vec3(1.0, 0.93, 0.70), vec3(2.2)) * glow * vLit * 0.6;
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

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

// The canvas every tree grows on, made once and replanted each time the forest is shown.
let treeGrower = null;
let treeTexture = null;
function getTreeTexture() {
  if (treeTexture) return treeTexture;
  const growSec = (k) => TREE_GROWTH.shortest + (k / (TREE_KINDS.length - 1)) * (TREE_GROWTH.longest - TREE_GROWTH.shortest);
  treeGrower = createTreeGrower(TREE_KINDS.map((kind, k) => ({ depth: kind.depth, growSec: growSec(k) })), TREE_VARIANTS, TREE_CELL_PX);
  treeTexture = new THREE.CanvasTexture(treeGrower.canvas);
  // Mipmapped, so a tree a few pixels wide is drawn smooth instead of flickering as the globe turns.
  treeTexture.generateMipmaps = true;
  treeTexture.minFilter = THREE.LinearMipmapLinearFilter;
  treeTexture.magFilter = THREE.LinearFilter;
  return treeTexture;
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
  let mesh = null;
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
    disposeMesh(mesh);
    disposeMesh(airMesh);
    disposeMesh(meridian);
    disposeMesh(lights);
    mesh = airMesh = meridian = lights = null;
    canopyMap = null;
    nextLight = 0;
    lastNoteStep = null;
    view.setElements([]);
    if (!song) return;
    canopyMap = song.map;
    mesh = buildTrees(song.map, performance.now() / 1000);
    view.globe.scene().add(mesh);
    grow();
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

  /** Sizes the lights and the trees, given in globe units, in the drawing buffer's pixels. */
  function updateScale() {
    const camera = view.globe.camera();
    const height = view.globe.renderer().getDrawingBufferSize(new THREE.Vector2()).y;
    const pxPerUnit = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    if (lights) lights.material.uniforms.uPxPerUnit.value = pxPerUnit;
    if (mesh) {
      mesh.material.uniforms.uPxPerUnit.value = pxPerUnit;
      mesh.material.uniforms.uBufferHeight.value = height;
    }
  }

  /**
   * The forest as trees: one sprite per tree, each a variant of its kind on the growing canvas, replanted to grow from
   * `now` (seconds, performance clock).
   */
  function buildTrees(map, now) {
    const trees = mapTrees(map);
    const n = trees.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const cellsOf = new Float32Array(n * 2);
    const sizes = new Float32Array(n);
    const lons = new Float32Array(n);
    const lats = new Float32Array(n);
    const kindColors = TREE_KINDS.map((kind) => new THREE.Color(kind.color));
    for (let i = 0; i < n; i++) {
      const { lat, lon, metres } = trees[i];
      const { x, y, z } = view.globe.getCoords(lat, lon, MERIDIAN_ALTITUDE);
      const kind = TREE_KINDS.indexOf(treeKindOf(metres));
      positions.set([x, y, z], i * 3);
      colors.set(kindColors[kind].toArray(), i * 3);
      cellsOf.set([kind, Math.floor(Math.random() * TREE_VARIANTS)], i * 2);
      sizes[i] = treeSizeU(metres);
      lons[i] = lon;
      lats[i] = lat;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aCell', new THREE.BufferAttribute(cellsOf, 2));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aLon', new THREE.BufferAttribute(lons, 1));
    geometry.setAttribute('aLat', new THREE.BufferAttribute(lats, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: treeVertex,
      fragmentShader: treeFragment,
      uniforms: {
        uTrees: { value: getTreeTexture() },
        uPxPerUnit: { value: 1 },
        uBufferHeight: { value: 1 },
        uLineLon: { value: 180 },
        uHighlight: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 1;
    const startSec = Array.from({ length: TREE_VARIANTS }, (_, v) => (v / TREE_VARIANTS) * TREE_GROWTH.stagger);
    treeGrower.restart(now, startSec);
    return points;
  }

  /** Keeps the trees growing frame by frame until all are grown, played or not. */
  function grow() {
    cancelAnimationFrame(growFrame);
    const frame = () => {
      if (!mesh) return;
      const growing = treeGrower.step(performance.now() / 1000);
      treeTexture.needsUpdate = true;
      updateScale();
      growFrame = growing ? requestAnimationFrame(frame) : 0;
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
    if (!mesh || !meridian) return;
    // The noon line moves from the first step; the listening legend does not hold it back.
    const lineStep = Math.max(0, Math.min(LINE_STEPS, step));
    const headLon = lineLonAt(lineStep);
    mesh.material.uniforms.uLineLon.value = headLon;
    mesh.material.uniforms.uHighlight.value = 1;
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
    updateScale();
  }

  return { reset, render };
}
