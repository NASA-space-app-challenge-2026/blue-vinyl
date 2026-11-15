// Renders 3-hourly atmospheric aerosol distributions as a transparent shell above the globe surface.
// Encoded frames (PNG, 576x722) provide 4 channels (dust, sulfate, sea salt in top half; smoke & flow in bottom).
// The WebGL shader decodes AOD values, applies EIC's color scheme, and allows toggling each particle type.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

const ALTITUDE = 0.005;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D uFrame0;
uniform sampler2D uFrame1;
uniform float uMix;
uniform float uEnableSalt;
uniform float uEnableDust;
uniform float uEnableSmoke;
uniform float uEnableSulf;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  // Top half: (0..360) -> v in [0.5, 1.0]
  // Bottom half: (361..721) -> v in [0.0, 0.5]
  vec2 uvTop = vec2(vUv.x, 0.5 + 0.5 * vUv.y);
  vec2 uvBottom = vec2(vUv.x, 0.5 * vUv.y);

  vec4 top0 = texture2D(uFrame0, uvTop);
  vec4 top1 = texture2D(uFrame1, uvTop);
  vec4 top = mix(top0, top1, uMix);

  vec4 bot0 = texture2D(uFrame0, uvBottom);
  vec4 bot1 = texture2D(uFrame1, uvBottom);
  vec4 bot = mix(bot0, bot1, uMix);

  // Top RGB: dust, sulfate, sea salt
  // Bottom R: smoke
  float rawDust = top.r;
  float rawSulf = top.g;
  float rawSalt = top.b;
  float rawSmoke = bot.r;

  // Gentle, soft level curve - toned down and transparent
  float lDust  = clamp(rawDust * 1.65 - 0.25, 0.0, 1.0);
  float lSulf  = clamp(rawSulf * 1.70 - 0.22, 0.0, 1.0);
  float lSalt  = clamp(rawSalt * 1.65 - 0.25, 0.0, 1.0);
  float lSmoke = clamp(rawSmoke * 1.65 - 0.25, 0.0, 1.0);

  // NASA EIC palette (natural, delicate tones)
  vec3 cSalt  = vec3(0.25, 0.55, 1.00);
  vec3 cDust  = vec3(1.00, 0.35, 0.75);
  vec3 cSmoke = vec3(1.00, 0.45, 0.10);
  vec3 cSulf  = vec3(0.30, 1.00, 0.35);

  vec3 rgb = pow(lSalt, 1.35) * cSalt * uEnableSalt
           + pow(lDust, 1.35) * cDust * uEnableDust
           + pow(lSmoke, 1.35) * cSmoke * uEnableSmoke
           + pow(lSulf, 1.35) * cSulf * uEnableSulf;

  // Softer tone mapping and gentle alpha so it never overwhelms the globe
  vec3 color = 1.0 - exp(-1.50 * rgb);
  float density = max(max(rgb.r, rgb.g), rgb.b);
  float alpha = clamp(density * 1.15, 0.0, 0.75) * uOpacity;

  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Creates the aerosol shell layer on the globe.
 *
 * @param {object} globe globe.gl instance
 */
export function createAerosolLayer(globe) {
  const radius = globe.getGlobeRadius();
  const geometry = new THREE.SphereGeometry(radius * (1 + ALTITUDE), 180, 90);

  const emptyTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
  emptyTex.needsUpdate = true;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uFrame0: { value: emptyTex },
      uFrame1: { value: emptyTex },
      uMix: { value: 0 },
      uEnableSalt: { value: 1.0 },
      uEnableDust: { value: 1.0 },
      uEnableSmoke: { value: 1.0 },
      uEnableSulf: { value: 1.0 },
      uOpacity: { value: 1.0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  globe.scene().add(mesh);

  const loader = new THREE.TextureLoader();
  const textureCache = new Map();

  function getTexture(url) {
    if (!url) return emptyTex;
    if (!textureCache.has(url)) {
      const tex = loader.load(url);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      textureCache.set(url, tex);
    }
    return textureCache.get(url);
  }

  function render(frames, timeSec, durationSec) {
    if (!frames || frames.length === 0) {
      hide();
      return;
    }

    const count = frames.length;
    const progress = Math.max(0, Math.min(1, timeSec / durationSec));
    const pos = progress * (count - 1);
    const idx0 = Math.floor(pos);
    const idx1 = Math.min(count - 1, idx0 + 1);
    const mix = pos - idx0;

    material.uniforms.uFrame0.value = getTexture(frames[idx0]);
    material.uniforms.uFrame1.value = getTexture(frames[idx1]);
    material.uniforms.uMix.value = mix;
    material.uniforms.uOpacity.value = 1.0;
    mesh.visible = true;

    if (idx1 + 1 < count) {
      getTexture(frames[idx1 + 1]);
    }
  }

  function setToggles({ salt = true, dust = true, smoke = true, sulfate = true }) {
    material.uniforms.uEnableSalt.value = salt ? 1.0 : 0.0;
    material.uniforms.uEnableDust.value = dust ? 1.0 : 0.0;
    material.uniforms.uEnableSmoke.value = smoke ? 1.0 : 0.0;
    material.uniforms.uEnableSulf.value = sulfate ? 1.0 : 0.0;
  }

  function hide() {
    mesh.visible = false;
  }

  return {
    render,
    setToggles,
    hide,
  };
}
