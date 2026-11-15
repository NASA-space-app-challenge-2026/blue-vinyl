// A comet tail drawn straight into the globe.gl scene behind a bird: wide, bright and glowing at the bird, thinning
// and fading toward the tail, with a white-hot core near the head. Other ribbons along a path, such as a storm's
// track, take their own TrailStyle.

// The same three.js revision globe.gl@2.46.2 bundles, so the mesh fits its scene.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

// Lifted slightly off the surface so the ribbon does not z-fight with the globe.
const ALTITUDE = 0.003;
// Ribbon samples per degree of arc, held between these bounds so short tails still curve and long ones stay cheap.
const SAMPLES_PER_DEG = 4;
const SAMPLES = Object.freeze({ min: 16, max: 512 });
/**
 * Shape along a ribbon, with t = 0 at its end and 1 at its head: width = headWidthPx · t^widthPow on screen, opacity =
 * tailAlpha + (1 - tailAlpha) · t^alphaPow, times `alpha`. `coreWhite`: how far the core whitens at the head.
 * `additive`: whether it adds light to what is under it (glows) or is laid over it.
 *
 * @typedef {Object} TrailStyle
 * @property {number} headWidthPx
 * @property {number} widthPow
 * @property {number} alpha
 * @property {number} tailAlpha
 * @property {number} alphaPow
 * @property {number} coreWhite
 * @property {boolean} additive
 */

/** @type {TrailStyle} */
export const COMET = Object.freeze({ headWidthPx: 7, widthPow: 0.6, alpha: 1, tailAlpha: 0, alphaPow: 1.6, coreWhite: 0.6, additive: true });
// How sharp the core is across the ribbon.
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
uniform float coreWhite;
varying float vAlpha;
varying float vAcross;
void main() {
  float edge = 1.0 - abs(vAcross);
  float core = pow(edge, ${CORE_SHARPNESS.toFixed(1)}) * vAlpha;
  gl_FragColor = vec4(mix(color, vec3(1.0), coreWhite * core), vAlpha * edge * edge);
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
 * @param {TrailStyle} [style]
 */
export function createCometTrail(globe, color, style = COMET) {
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(SAMPLES.max * 2 * 3), 3);
  const alpha = new THREE.BufferAttribute(new Float32Array(SAMPLES.max * 2), 1);
  const across = new Float32Array(SAMPLES.max * 2).map((_, i) => (i % 2 ? 1 : -1));
  geometry.setAttribute('position', position);
  geometry.setAttribute('alpha', alpha);
  geometry.setAttribute('across', new THREE.BufferAttribute(across, 1));
  geometry.setIndex(new THREE.BufferAttribute(INDEX, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, coreWhite: { value: style.coreWhite } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: style.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
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
    const headWidth = style.headWidthPx * unitsPerPx;
    const tangent = new THREE.Vector3();
    const side = new THREE.Vector3();
    for (let i = 0; i < samples; i++) {
      const p = points[i];
      tangent.subVectors(points[Math.min(i + 1, samples - 1)], points[Math.max(i - 1, 0)]);
      side.crossVectors(tangent, p).normalize();
      const t = i / (samples - 1);
      const half = 0.5 * headWidth * t ** style.widthPow;
      const a = style.alpha * (style.tailAlpha + (1 - style.tailAlpha) * t ** style.alphaPow);
      position.setXYZ(2 * i, p.x - side.x * half, p.y - side.y * half, p.z - side.z * half);
      position.setXYZ(2 * i + 1, p.x + side.x * half, p.y + side.y * half, p.z + side.z * half);
      alpha.setX(2 * i, a);
      alpha.setX(2 * i + 1, a);
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
