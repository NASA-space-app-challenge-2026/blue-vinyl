// A comet tail drawn straight into the globe.gl scene behind a bird: wide, bright and glowing at the bird, thinning
// and fading toward the tail, with a white-hot core near the head.

// The same three.js revision globe.gl@2.46.2 bundles, so the mesh fits its scene.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

// Lifted slightly off the surface so the ribbon does not z-fight with the globe.
const ALTITUDE = 0.003;
// Ribbon samples per degree of arc, held between these bounds so short tails still curve and long ones stay cheap.
const SAMPLES_PER_DEG = 4;
const SAMPLES = Object.freeze({ min: 16, max: 512 });
// Shape along the tail, with t = 0 at its end and 1 at the bird: width = HEAD_WIDTH_PX · t^WIDTH_POW on screen,
// opacity = t^ALPHA_POW.
const HEAD_WIDTH_PX = 7;
const WIDTH_POW = 0.6;
const ALPHA_POW = 1.6;
// How far the core whitens at the head, and how sharp it is across the ribbon.
const CORE_WHITE = 0.6;
const CORE_SHARPNESS = 8;

const vertexShader = `
attribute float alpha;
attribute float across;
varying float vAlpha;
varying float vAcross;
void main() {
  vAlpha = alpha;
  vAcross = across;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Soft edges across the ribbon; the core brightens toward the bird.
const fragmentShader = `
uniform vec3 color;
varying float vAlpha;
varying float vAcross;
void main() {
  float edge = 1.0 - abs(vAcross);
  float core = pow(edge, ${CORE_SHARPNESS.toFixed(1)}) * vAlpha;
  gl_FragColor = vec4(mix(color, vec3(1.0), ${CORE_WHITE.toFixed(2)} * core), vAlpha * edge * edge);
  #include <colorspace_fragment>
}`;

// Triangle indices for the longest ribbon, two vertices per sample; each tail draws only the part it needs.
const INDEX = (() => {
  const index = new Uint32Array((SAMPLES.max - 1) * 6);
  for (let i = 0; i < SAMPLES.max - 1; i++) {
    const a = 2 * i;
    index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], 6 * i);
  }
  return index;
})();

/**
 * @param {Object} globe a globe.gl instance
 * @param {string} color CSS color
 */
export function createCometTrail(globe, color) {
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(SAMPLES.max * 2 * 3), 3);
  const alpha = new THREE.BufferAttribute(new Float32Array(SAMPLES.max * 2), 1);
  const across = new Float32Array(SAMPLES.max * 2).map((_, i) => (i % 2 ? 1 : -1));
  geometry.setAttribute('position', position);
  geometry.setAttribute('alpha', alpha);
  geometry.setAttribute('across', new THREE.BufferAttribute(across, 1));
  geometry.setIndex(new THREE.BufferAttribute(INDEX, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  globe.scene().add(mesh);

  function hide() {
    mesh.visible = false;
  }

  /**
   * @param {[number, number][]} latLngs from the tail's end to the bird
   * @param {number} unitsPerPx scene units per screen pixel near the view centre
   */
  function update(latLngs, unitsPerPx) {
    const radius = globe.getGlobeRadius() * (1 + ALTITUDE);
    const controls = latLngs.map(([lat, lng]) => {
      const { x, y, z } = globe.getCoords(lat, lng, ALTITUDE);
      return new THREE.Vector3(x, y, z);
    });
    const curve = new THREE.CatmullRomCurve3(controls, false, 'centripetal');
    const arcDeg = THREE.MathUtils.radToDeg(curve.getLength() / radius);
    if (!(arcDeg > 0)) {
      hide();
      return;
    }
    const samples = THREE.MathUtils.clamp(Math.ceil(arcDeg * SAMPLES_PER_DEG), SAMPLES.min, SAMPLES.max);
    // A chord between far-apart points dips into the globe, so every sample goes back onto the sphere.
    const points = curve.getSpacedPoints(samples - 1).map((p) => p.setLength(radius));
    const headWidth = HEAD_WIDTH_PX * unitsPerPx;
    const tangent = new THREE.Vector3();
    const side = new THREE.Vector3();
    for (let i = 0; i < samples; i++) {
      const p = points[i];
      tangent.subVectors(points[Math.min(i + 1, samples - 1)], points[Math.max(i - 1, 0)]);
      side.crossVectors(tangent, p).normalize();
      const t = i / (samples - 1);
      const half = 0.5 * headWidth * t ** WIDTH_POW;
      position.setXYZ(2 * i, p.x - side.x * half, p.y - side.y * half, p.z - side.z * half);
      position.setXYZ(2 * i + 1, p.x + side.x * half, p.y + side.y * half, p.z + side.z * half);
      alpha.setX(2 * i, t ** ALPHA_POW);
      alpha.setX(2 * i + 1, t ** ALPHA_POW);
    }
    position.needsUpdate = true;
    alpha.needsUpdate = true;
    geometry.setDrawRange(0, (samples - 1) * 6);
    mesh.visible = true;
  }

  function dispose() {
    globe.scene().remove(mesh);
    geometry.dispose();
    material.dispose();
  }

  return { update, hide, dispose };
}
