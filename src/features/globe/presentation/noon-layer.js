// A forest track on the globe: the GEDI canopy map as trees, big and small, lit by the noon sun, the noon meridian
// moving west, and a note of light where each tree starts to grow: the music plays that tree there and then (see
// composers/noon.js); the light is in its voice's colour and lets a few motes of pollen rise from the tree.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { Band, LINE_STEPS, lineLonAt } from '../../tracks/domain/noon-line.js';
import { TREE_SIZE, treeSizeU } from '../../tracks/domain/forest-trees.js';
import { createGrowingTree } from './tree-sprites.js';

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
// Trees are drawn over the globe without a depth test (an upright sprite against the surface flickered as the two
// fought for depth), so a tree behind the globe is hidden by hand: by how much its ground faces the camera (cosine),
// gone at `hiddenAt` and fully shown from `shownFrom`, so it fades at the rim.
const TREE_LIMB = Object.freeze({ hiddenAt: 0, shownFrom: 0.12 });
// A tree the music has gone back past fades out over this long (s) instead of vanishing.
const TREE_FADE_OUT_SEC = 0.15;
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
// The glow where a tree's note is struck: bigger the taller the tree (share 0..1).
const NOTE_GLOW = Object.freeze({ life: 0.9, size: [5, 11], grow: 1.7 });
// Motes of pollen rising from the tree, more the taller it is.
const MOTE = Object.freeze({ count: [2, 5], life: [1.6, 2.8], size: [2.5, 4.5], rise: [3, 6], drift: 3, sway: 1.2, grow: 0.45 });
// Each voice in its own colour, so the eye can follow the ear: the north's flute cool, the tropics' lead gold, the
// south's pizzicato rose. The warm light is every glow's heart.
const VOICE_COLORS = Object.freeze({
  [Band.NORTH]: '#7fd0ff',
  [Band.TROPICS]: '#ffc94d',
  [Band.SOUTH]: '#ff8fb1',
});
const LIGHT_HEART = '#fff1cf';
// Steps a frame may jump and still have each tree's note shown (more is a seek).
const MAX_STEPS_A_FRAME = 4;
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

const between = ([low, high], share = Math.random()) => low + share * (high - low);
const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
// Scratch for a tree's direction to the camera, reused every frame.
const toCamera = new THREE.Vector3();

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

/**
 * @param {{ globe: Object, unitsPerPx: () => number, setElements: (elements: Object[]) => void }} view
 */
export function createNoonLayer(view) {
  let trees = [];
  let meridian = null;
  let lights = null;
  let nextLight = 0;
  let growFrame = 0;

  function disposeMesh(m) {
    if (!m) return;
    view.globe.scene().remove(m);
    m.geometry.dispose();
    m.material.dispose();
  }

  /** Takes the forest off the globe and, for `song`, puts them and the noon meridian on. */
  function reset(song, color) {
    for (const tree of trees) unplant(tree);
    trees = [];
    disposeMesh(meridian);
    disposeMesh(lights);
    meridian = lights = null;
    nextLight = 0;
    view.setElements([]);
    if (!song) return;
    // Copies, since the layer keeps each tree's sprite on it.
    trees = song.trees.map((tree) => ({ ...tree }));
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

  /** The note of a tree: a glow where it starts, as big as it is tall, and pollen from it. */
  function lightTree(tree, now) {
    const color = voiceColors[tree.band];
    const share = (treeSizeU(tree.metres) - TREE_SIZE.smallestU) / (TREE_SIZE.tallestU - TREE_SIZE.smallestU);
    light({
      lat: tree.lat, lon: tree.lon, color, now,
      life: NOTE_GLOW.life, size: between(NOTE_GLOW.size, share), grow: NOTE_GLOW.grow, attack: 0.06, rises: false,
    });
    for (let made = 0; made < Math.round(between(MOTE.count, share)); made++) {
      light({
        lat: tree.lat, lon: tree.lon, color, now,
        life: between(MOTE.life), size: between(MOTE.size), grow: MOTE.grow, attack: 0.15, rises: true,
      });
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
    const size = treeSizeU(tree.metres);
    tree.grower = createGrowingTree({
      color: kind.color,
      depth: kind.depth,
      growSec: tree.growSec,
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
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const { x, y, z } = view.globe.getCoords(tree.lat, tree.lon, MERIDIAN_ALTITUDE);
    sprite.position.set(x, y, z);
    sprite.center.set(TREE_BASE.x, TREE_BASE.y);
    sprite.scale.set(size, size, 1);
    sprite.renderOrder = 1;
    // The sprite stands up from its base, outside the bounds three.js culls by, so it would pop at the screen's edge.
    sprite.frustumCulled = false;
    const ground = sprite.position.clone().normalize();
    sprite.onBeforeRender = (renderer, scene, camera) => {
      const facing = toCamera.subVectors(camera.position, sprite.position).normalize().dot(ground);
      sprite.material.opacity = smoothstep(TREE_LIMB.hiddenAt, TREE_LIMB.shownFrom, facing) * tree.fadeOut;
    };
    tree.sprite = sprite;
    tree.growing = true;
    tree.fadeOut = 1;
    tree.leavingAt = null;
    view.globe.scene().add(sprite);
    growTrees();
  }

  /** Starts `tree` fading out; the frame loop takes it off the globe once it is gone. */
  function fadeOut(tree) {
    tree.leavingAt = performance.now() / 1000;
    growTrees();
  }

  function unplant(tree) {
    if (!tree.sprite) return;
    view.globe.scene().remove(tree.sprite);
    tree.sprite.material.map.dispose();
    tree.sprite.material.dispose();
    tree.sprite = tree.grower = null;
    tree.growing = false;
    tree.leavingAt = null;
  }

  /** Draws the growing trees frame by frame until every planted tree is grown. */
  function growTrees() {
    if (growFrame) return;
    const frame = () => {
      const now = performance.now() / 1000;
      let any = false;
      for (const tree of trees) {
        if (tree.leavingAt !== null) {
          tree.fadeOut = 1 - (now - tree.leavingAt) / TREE_FADE_OUT_SEC;
          if (tree.fadeOut <= 0) unplant(tree);
          else any = true;
          continue;
        }
        if (!tree.growing) continue;
        tree.growing = tree.grower.step(now);
        tree.sprite.material.map.needsUpdate = true;
        any ||= tree.growing;
      }
      growFrame = any ? requestAnimationFrame(frame) : 0;
    };
    growFrame = requestAnimationFrame(frame);
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
   * @param {{ map: Object, line: Object }} song
   * @param {number} step
   * @param {boolean} [playing]  whether the music is playing, so notes are heard and lit
   */
  function render(song, step, playing = false) {
    if (!meridian) return;
    // The noon line moves from the first step; the listening legend does not hold it back.
    const lineStep = Math.max(0, Math.min(LINE_STEPS, step));
    const headLon = lineLonAt(lineStep);
    // A picked tree grows once the line has crossed it, and is gone again if the music goes back before that.
    const now = performance.now() / 1000;
    for (const tree of trees) {
      if (!tree.sprite && lineStep >= tree.startStep) {
        plant(tree);
        // A tree's note sounds as it starts (composers/noon.js); a seek past it plants it without a note.
        if (playing && lineStep - tree.startStep <= MAX_STEPS_A_FRAME) lightTree(tree, now);
      } else if (tree.sprite && tree.leavingAt === null && lineStep < tree.startStep) fadeOut(tree);
      else if (tree.sprite && tree.leavingAt !== null && lineStep >= tree.startStep) {
        tree.leavingAt = null;
        tree.fadeOut = 1;
      }
      if (tree.sprite) tree.sprite.material.color.setScalar(sunAt(tree.lat, tree.lon, headLon));
    }
    placeMeridian(headLon);
    meridian.visible = true;

    lights.material.uniforms.uTime.value = now;
    updateLightScale();
  }

  return { reset, render };
}
