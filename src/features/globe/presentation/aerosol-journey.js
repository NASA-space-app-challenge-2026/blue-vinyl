// How each event of an aerosol track spreads, drawn with the music (see aerosolCues in music/domain/aerosol-score.js).
// Whenever the motif is played at the event's source, a puff of glowing grains leaves the source, as many as the
// motif is loud, and drifts on GEOS-FP's own winds (the flow in the bottom half of every frame, see aerosol-layer.js),
// so the grains fan out the way the air carries them. When an echo is heard, the grains that have travelled furthest
// in proportion light up: the first echo the nearest third, the last echo the furthest. When the motif arrives at the
// distant place, a ring opens there; a smaller one opens at the source with every puff.

// The same three.js revision globe.gl@2.46.2 bundles, so the meshes fit its scene.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

import { MAX_ECHOES } from '../../music/domain/aerosol-score.js';

// Each particle type in EIC's colour, as the particle toggles show it.
const PARTICLE_COLOR = Object.freeze({ seaSalt: '#4080ff', dust: '#ff58a0', smoke: '#ff7820', sulfate: '#50d060' });
// The particle toggle of each particle type.
const TOGGLE = Object.freeze({ seaSalt: 'salt', dust: 'dust', smoke: 'smoke', sulfate: 'sulfate' });
// Above the particles' shell (see aerosol-layer.js), so it does not veil them.
const ALTITUDE = 0.008;
const EARTH_KM = 6371;
// Model time of one record: 3 hours.
const STEP_SEC = 3 * 3600;

// A puff: GRAINS.min grains for the softest motif up to GRAINS.max for the loudest, scattered about the source with
// this spread (degrees, one standard deviation).
const GRAINS = Object.freeze({ min: 14, max: 48, spreadDeg: 1.6 });
// A grain lives this long (s of music) and fades out over its last FADE_SEC; long enough to cross an ocean.
const LIFE_SEC = 24;
const FADE_SEC = 5;
const POOL = 2400;
// A grain's look: size (px), and opacity at rest and when its echo lights it.
const GRAIN = Object.freeze({ sizePx: 3.2, restAlpha: 0.55, litAlpha: 1 });
// How long an echo lights its grains (s).
const ECHO_SEC = 0.7;
// A simulation step (s of music); a jump further than JUMP_SEC (a seek) replays the grains still alive from scratch.
const TICK_SEC = 1 / 30;
const JUMP_SEC = 0.5;
// A ring's life (s), and its radius (degrees of arc) as it opens.
const RING = Object.freeze({
  source: { lifeSec: 1.2, fromDeg: 0.5, toDeg: 3.5 },
  arrival: { lifeSec: 1.8, fromDeg: 1, toDeg: 8 },
});
const RING_POOL = 12;

// The flow in a frame: 576 × 361 cells, 0.625° × 0.5°, north up from 90° N, west edge at 180° W, eastward and
// northward speed as 255 · (v + 40) / 80 in the green and blue of the bottom half.
const FLOW = Object.freeze({ width: 576, height: 361, dLon: 0.625, dLat: 0.5, maxSpeed: 40 });
// Decoded flows kept at once (1.7 MB each): the frames around the clock.
const FLOW_CACHE = 6;

/**
 * @param {Object} globe a globe.gl instance
 */
export function createAerosolJourney(globe) {
  const flows = new Map(); // frame URL -> Promise while decoding, then { u, v } (Float32Array)

  // Grains: one pool for every event of the track.
  const lat = new Float32Array(POOL);
  const lon = new Float32Array(POOL);
  const born = new Float32Array(POOL).fill(-Infinity);
  const owner = new Int8Array(POOL).fill(-1);
  const distance = new Float32Array(POOL);
  const origin = new Float32Array(POOL * 2); // where each grain left, for how far it has gone
  let next = 0;

  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(POOL * 3), 3);
  const color = new THREE.BufferAttribute(new Float32Array(POOL * 3), 3);
  const alpha = new THREE.BufferAttribute(new Float32Array(POOL), 1);
  geometry.setAttribute('position', position);
  geometry.setAttribute('color', color);
  geometry.setAttribute('alpha', alpha);
  const material = new THREE.ShaderMaterial({
    uniforms: { sizePx: { value: GRAIN.sizePx * window.devicePixelRatio } },
    vertexShader: `
      attribute vec3 color;
      attribute float alpha;
      uniform float sizePx;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        gl_PointSize = sizePx * (0.7 + 0.6 * alpha);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0 || vAlpha <= 0.0) discard;
        float glow = pow(1.0 - d, 1.5);
        gl_FragColor = vec4(mix(vColor, vec3(1.0), 0.35 * glow * vAlpha), glow * vAlpha);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2; // over the particles' shell, which draws at 1
  points.visible = false;
  globe.scene().add(points);

  const ringGeometry = new THREE.RingGeometry(0.7, 1, 64);
  const rings = Array.from({ length: RING_POOL }, () => {
    const mesh = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    globe.scene().add(mesh);
    return mesh;
  });

  let simCues = null; // the cues the grains were simulated for
  let simSec = 0;

  function clear() {
    born.fill(-Infinity);
    owner.fill(-1);
    next = 0;
  }

  /** A frame's flow, decoded once; null until it is. */
  function flowOf(url) {
    const known = flows.get(url);
    if (known && !(known instanceof Promise)) return known;
    if (!known) {
      const loading = new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
      }).then((image) => {
        const canvas = document.createElement('canvas');
        canvas.width = FLOW.width;
        canvas.height = FLOW.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, -FLOW.height); // the bottom half
        const { data } = context.getImageData(0, 0, FLOW.width, FLOW.height);
        const u = new Float32Array(FLOW.width * FLOW.height);
        const v = new Float32Array(FLOW.width * FLOW.height);
        for (let i = 0; i < u.length; i++) {
          u[i] = (data[4 * i + 1] / 255) * 2 * FLOW.maxSpeed - FLOW.maxSpeed;
          v[i] = (data[4 * i + 2] / 255) * 2 * FLOW.maxSpeed - FLOW.maxSpeed;
        }
        flows.delete(url);
        flows.set(url, { u, v });
        for (const old of flows.keys()) {
          if (flows.size <= FLOW_CACHE) break;
          if (!(flows.get(old) instanceof Promise)) flows.delete(old);
        }
      });
      loading.catch(() => flows.delete(url));
      flows.set(url, loading);
    }
    return null;
  }

  /** Eastward and northward wind (m/s) at a point, from a decoded flow. */
  function windAt(flow, la, lo) {
    const col = Math.floor(((((lo + 180) % 360) + 360) % 360) / FLOW.dLon) % FLOW.width;
    const row = Math.min(FLOW.height - 1, Math.max(0, Math.round((90 - la) / FLOW.dLat)));
    const i = row * FLOW.width + col;
    return [flow.u[i], flow.v[i]];
  }

  /** Where `p` (a place, or 'eye' for the view centre) is at `sec` of the track. */
  function placeAt(p, records, sec, durationSec) {
    if (p !== 'eye') return p;
    const view = records[Math.round(Math.max(0, Math.min(1, sec / durationSec)) * (records.length - 1))];
    return { lat: view.viewLat, lon: view.viewLon };
  }

  function emit(cue, events, records, durationSec) {
    const source = placeAt(events[cue.event].source, records, cue.timeSec, durationSec);
    const random = seeded(Math.round(cue.timeSec * 1000) + 7919 * cue.event);
    const count = Math.round(GRAINS.min + (GRAINS.max - GRAINS.min) * cue.strength);
    for (let n = 0; n < count; n++) {
      const g = next;
      next = (next + 1) % POOL;
      lat[g] = source.lat + GRAINS.spreadDeg * gaussian(random);
      lon[g] = source.lon + (GRAINS.spreadDeg * gaussian(random)) / Math.cos((source.lat * Math.PI) / 180);
      born[g] = cue.timeSec;
      owner[g] = cue.event;
      origin[2 * g] = source.lat;
      origin[2 * g + 1] = source.lon;
    }
  }

  /** Moves every live grain on by `dt` s of music, on the flow at `sec`. */
  function drift(frames, sec, dt, durationSec) {
    const pos = Math.max(0, Math.min(1, sec / durationSec)) * (frames.length - 1);
    const i0 = Math.floor(pos);
    const a = pos - i0;
    const f0 = flowOf(frames[i0]);
    const f1 = flowOf(frames[Math.min(frames.length - 1, i0 + 1)]);
    flowOf(frames[Math.min(frames.length - 1, i0 + 2)]); // decode ahead
    if (!f0) return;
    const modelSec = (dt * STEP_SEC * frames.length) / durationSec;
    const toDeg = 180 / Math.PI / (EARTH_KM * 1000);
    for (let g = 0; g < POOL; g++) {
      if (owner[g] < 0 || sec - born[g] > LIFE_SEC) continue;
      let [u, v] = windAt(f0, lat[g], lon[g]);
      if (f1) {
        const [u1, v1] = windAt(f1, lat[g], lon[g]);
        u += a * (u1 - u);
        v += a * (v1 - v);
      }
      const cosLat = Math.max(0.05, Math.cos((lat[g] * Math.PI) / 180));
      lat[g] = Math.max(-89, Math.min(89, lat[g] + v * modelSec * toDeg));
      lon[g] = ((((lon[g] + (u * modelSec * toDeg) / cosLat + 180) % 360) + 360) % 360) - 180;
    }
  }

  /** Runs the grains on from where they were to `trackSec`, puffing at every source cue on the way. */
  function simulate(frames, cues, events, records, trackSec, durationSec) {
    if (simCues !== cues || trackSec < simSec || trackSec - simSec > JUMP_SEC) {
      // A new track or a seek: replay only the grains that would still be alive.
      clear();
      simCues = cues;
      simSec = Math.max(0, trackSec - LIFE_SEC);
      for (const cue of cues) {
        if (cue.kind === 'source' && cue.timeSec <= simSec && cue.timeSec > simSec - LIFE_SEC) emit(cue, events, records, durationSec);
      }
    }
    while (simSec < trackSec) {
      const dt = Math.min(TICK_SEC, trackSec - simSec);
      for (const cue of cues) {
        if (cue.kind === 'source' && cue.timeSec > simSec && cue.timeSec <= simSec + dt) emit(cue, events, records, durationSec);
      }
      drift(frames, simSec, dt, durationSec);
      simSec += dt;
    }
  }

  /**
   * @param {Object} args
   * @param {import('../../album/domain/album.js').AerosolEvent[]} args.events
   * @param {import('../../tracks/domain/aerosol-track.js').AerosolRecord[]} args.records
   * @param {string[]} args.frames frame URLs, one per record
   * @param {import('../../music/domain/aerosol-score.js').AerosolCue[]} args.cues
   * @param {number} args.trackSec
   * @param {number} args.durationSec
   * @param {Record<string, boolean>} args.shown which particle types are switched on
   */
  function render({ events, records, frames, cues, trackSec, durationSec, shown }) {
    simulate(frames, cues, events, records, trackSec, durationSec);

    // How far each event's grains have gone, for the echoes' thirds.
    const far = events.map(() => 0);
    for (let g = 0; g < POOL; g++) {
      const e = owner[g];
      if (e < 0 || trackSec - born[g] > LIFE_SEC) continue;
      distance[g] = arcDeg({ lat: origin[2 * g], lon: origin[2 * g + 1] }, lat[g], lon[g]);
      far[e] = Math.max(far[e], distance[g]);
    }
    // The light each echo still gives its third, by event.
    const lit = events.map(() => new Float32Array(MAX_ECHOES + 1));
    for (const cue of cues) {
      if (cue.timeSec > trackSec) break;
      if (cue.kind !== 'echo' || trackSec - cue.timeSec >= ECHO_SEC) continue;
      const glow = (1 - (trackSec - cue.timeSec) / ECHO_SEC) * (0.5 + 0.5 * cue.strength);
      lit[cue.event][cue.k] = Math.max(lit[cue.event][cue.k], glow);
    }

    const rgb = events.map((e) => new THREE.Color(PARTICLE_COLOR[e.particle] ?? '#ffffff'));
    for (let g = 0; g < POOL; g++) {
      const e = owner[g];
      const age = trackSec - born[g];
      if (e < 0 || age < 0 || age > LIFE_SEC || !shown[TOGGLE[events[e].particle]]) {
        alpha.setX(g, 0);
        continue;
      }
      const third = far[e] > 0 ? Math.min(MAX_ECHOES, 1 + Math.floor((MAX_ECHOES * distance[g]) / (far[e] + 1e-6))) : 1;
      const fade = Math.min(1, (LIFE_SEC - age) / FADE_SEC) * Math.min(1, age / 0.3);
      alpha.setX(g, fade * (GRAIN.restAlpha + (GRAIN.litAlpha - GRAIN.restAlpha) * lit[e][third]));
      const { x, y, z } = globe.getCoords(lat[g], lon[g], ALTITUDE);
      position.setXYZ(g, x, y, z);
      color.setXYZ(g, rgb[e].r, rgb[e].g, rgb[e].b);
    }
    position.needsUpdate = true;
    color.needsUpdate = true;
    alpha.needsUpdate = true;
    points.visible = true;

    // Rings at the source with every puff, and at the distant place on every arrival.
    const radius = globe.getGlobeRadius();
    let used = 0;
    for (const cue of cues) {
      if (cue.timeSec > trackSec) break;
      const ring = RING[cue.kind];
      if (!ring || trackSec - cue.timeSec >= ring.lifeSec || used >= rings.length) continue;
      const event = events[cue.event];
      if (!shown[TOGGLE[event.particle]]) continue;
      const place = placeAt(cue.kind === 'source' ? event.source : event.receptor, records, trackSec, durationSec);
      const t = (trackSec - cue.timeSec) / ring.lifeSec;
      const mesh = rings[used++];
      const { x, y, z } = globe.getCoords(place.lat, place.lon, ALTITUDE);
      mesh.position.set(x, y, z);
      mesh.lookAt(0, 0, 0);
      const scale = radius * THREE.MathUtils.degToRad(ring.fromDeg + (ring.toDeg - ring.fromDeg) * Math.sqrt(t));
      mesh.scale.set(scale, scale, scale);
      mesh.material.color.set(PARTICLE_COLOR[event.particle] ?? '#ffffff');
      mesh.material.opacity = (0.35 + 0.65 * cue.strength) * (1 - t) ** 1.5;
      mesh.visible = true;
    }
    for (let r = used; r < rings.length; r++) rings[r].visible = false;
  }

  function hide() {
    points.visible = false;
    for (const ring of rings) ring.visible = false;
    simCues = null;
  }

  return { render, hide };
}

/** Degrees of arc from `a` to a point. */
function arcDeg(a, la, lo) {
  const rad = Math.PI / 180;
  const cos = Math.sin(a.lat * rad) * Math.sin(la * rad) + Math.cos(a.lat * rad) * Math.cos(la * rad) * Math.cos((lo - a.lon) * rad);
  return Math.acos(Math.max(-1, Math.min(1, cos))) / rad;
}

/** A small seeded random generator (mulberry32), so a puff scatters the same way every time it is replayed. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random) {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}
