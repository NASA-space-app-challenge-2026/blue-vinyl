// A glow around the globe that breathes with the music, drawn by a WebGL shader. Each place on the rim shows one
// frequency band, mirrored left and right: low notes at 6 o'clock rising to high ones at 12. Like sunlight scattered
// in the air, a thin near-white band hugs the rim and a haze in the track's colour fades out beyond it; where a band
// is loud the rim brightens and the haze reaches further. It fades away with the music. Given a swirl (setSwirl), the
// haze streams out in spiral arms that turn with it, anticlockwise, as wind leaving a storm.
//
// An album can also thicken the air (setAir): the haze then reaches further and stronger all round, whatever the
// music, like the blanket of CO₂ the forest album plays.

// The same three.js revision globe.gl@2.46.2 bundles.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

// Bands per side of the rim.
const BANDS = 48;
// Each band is averaged with this many neighbours on either side, so the rim swells in broad waves.
const SPREAD = 1;
// Bands spread on a log scale over the range the instruments play in.
const BAND_HZ = Object.freeze({ min: 60, max: 2500 });
// Music is quieter the higher it goes; each octave above BAND_HZ.min is lifted this much so the whole rim takes part.
const TILT_DB_PER_OCTAVE = 5;
// Loudness is raised to this power, so loud bands stand out from quiet ones.
const CONTRAST = 1.5;
// Shape of the light, in globe radii: the rim band's half-width and the haze's falloff length, silent to loud.
const RIM_WIDTH = 0.015;
const HAZE_REACH = Object.freeze({ silent: 0.04, loud: 0.12 });
// Strength of the rim band and the haze, silent to loud, and how far the rim is whitened.
const RIM_GAIN = Object.freeze({ silent: 0.35, loud: 1 });
const HAZE_GAIN = Object.freeze({ silent: 0.2, loud: 0.9 });
const RIM_WHITENING = 0.75;
// A new track's colour eases in with this time constant.
const COLOR_TAU_SEC = 0.4;
// The swirl's spiral arms around the rim, and how fast they climb outward (radians of phase per globe radius); at full
// strength the haze ranges from `floor` between arms to 1 + `lift` on them.
const SWIRL = Object.freeze({ arms: 6, outward: 14, floor: 0.12, lift: 1.2 });
// What a fully thick air (setAir(1)) adds to the haze's reach (globe radii) and strength.
const AIR = Object.freeze({ reach: 0.16, gain: 0.45 });

// A JS number as a GLSL float literal.
const f = (v) => v.toFixed(4);

const vertexShader = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// gl_FragCoord and uCenter are in device pixels, y up.
const fragmentShader = `
#define PI 3.141592653589793
uniform sampler2D uLevels;
uniform vec2 uCenter;
uniform float uRadius;
uniform vec3 uColor;
uniform float uSwirlPhase;
uniform float uSwirlStrength;
uniform float uAir;
void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  // 0 at 6 o'clock to 1 at 12 on both sides, sampled between texel centres so the bands blend.
  float u = abs(atan(p.x, -p.y)) / PI;
  float level = texture2D(uLevels, vec2((u * ${f(BANDS - 1)} + 0.5) / ${f(BANDS)}, 0.5)).r;
  // Height above the rim, in globe radii; below it the globe hides the light.
  float h = length(p) / uRadius - 1.0;
  float x = h / ${f(RIM_WIDTH)};
  float rim = exp(-x * x) * mix(${f(RIM_GAIN.silent)}, ${f(RIM_GAIN.loud)}, level);
  float reach = mix(${f(HAZE_REACH.silent)}, ${f(HAZE_REACH.loud)}, level) + uAir * ${f(AIR.reach)};
  float haze = exp(-max(h, 0.0) / reach) * step(0.0, h)
    * (mix(${f(HAZE_GAIN.silent)}, ${f(HAZE_GAIN.loud)}, level) + uAir * ${f(AIR.gain)});
  // Arms turning anticlockwise with the phase (angles grow anticlockwise, y up) and so climbing outward: a crest sits
  // where the angle less the phase, times the arms, plus the climb is constant.
  float arm = 0.5 + 0.5 * sin(${f(SWIRL.arms)} * (atan(p.x, -p.y) - uSwirlPhase) + ${f(SWIRL.outward)} * max(h, 0.0));
  haze *= mix(1.0, ${f(SWIRL.floor)} + ${f(1 - SWIRL.floor + SWIRL.lift)} * arm * arm * arm, uSwirlStrength);
  float alpha = clamp(rim + haze, 0.0, 1.0);
  vec3 color = mix(uColor, vec3(1.0), ${f(RIM_WHITENING)} * rim / max(rim + haze, 1e-4));
  gl_FragColor = vec4(color * alpha, alpha);
}`;

function bandEdgeHz(i) {
  return BAND_HZ.min * (BAND_HZ.max / BAND_HZ.min) ** (i / BANDS);
}

/**
 * @param {HTMLCanvasElement} canvas covers the area the glow may reach
 * @param {() => AnalyserNode | null} getAnalyser the music's analyser, or null before audio is unlocked
 */
export function createHalo(canvas, getAnalyser) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true });
  renderer.setClearColor(0x000000, 0);
  const texture = new THREE.DataTexture(new Uint8Array(BANDS), BANDS, 1, THREE.RedFormat);
  texture.magFilter = THREE.LinearFilter;
  // Kept in sRGB, as the page shows it; the shader writes it out unconverted.
  const color = new THREE.Vector3(1, 1, 1);
  const targetColor = color.clone();
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uLevels: { value: texture },
      uCenter: { value: new THREE.Vector2() },
      uRadius: { value: 1 },
      uColor: { value: color },
      uSwirlPhase: { value: 0 },
      uSwirlStrength: { value: 0 },
      uAir: { value: 0 },
    },
    blending: THREE.NoBlending,
    depthTest: false,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const camera = new THREE.Camera();
  let bins = null;
  let getSwirl = null;
  let frame = null;
  let lastFrame = null;

  /** @param {{ x: number, y: number, r: number }} disc the globe in the canvas's CSS pixels */
  function place({ x, y, r }) {
    const dpr = window.devicePixelRatio;
    renderer.setPixelRatio(dpr);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    material.uniforms.uCenter.value.set(x * dpr, (canvas.clientHeight - y) * dpr);
    material.uniforms.uRadius.value = r * dpr;
    wake();
  }

  /** @param {string} css the track's colour; it eases in while the glow shows, and is taken at once while it doesn't */
  function setColor(css) {
    const { r, g, b } = new THREE.Color(css).getRGB({}, THREE.SRGBColorSpace);
    targetColor.set(r, g, b);
    if (frame === null) color.copy(targetColor);
  }

  /**
   * @param {(() => { phase: number, strength: number }) | null} next the swirl the haze streams out with (phase in
   *   radians, anticlockwise; strength 0..1), read every frame; null for none
   */
  function setSwirl(next) {
    getSwirl = next;
  }

  /** @param {number} thickness 0 (the music alone) to 1 (the thickest air) */
  function setAir(thickness) {
    material.uniforms.uAir.value = thickness;
  }

  /** Starts drawing frames, if not already; they stop by themselves once the music has fallen silent. */
  function wake() {
    if (frame === null) frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    frame = null;
    const levels = bandLevels();
    if (!levels) {
      lastFrame = null;
      renderer.clear();
      return;
    }
    const dt = lastFrame === null ? 0 : (now - lastFrame) / 1000;
    lastFrame = now;
    color.lerp(targetColor, 1 - Math.exp(-dt / COLOR_TAU_SEC));
    levels.forEach((level, i) => {
      texture.image.data[i] = Math.round(level * 255);
    });
    texture.needsUpdate = true;
    const swirl = getSwirl?.() ?? { phase: 0, strength: 0 };
    material.uniforms.uSwirlPhase.value = swirl.phase;
    material.uniforms.uSwirlStrength.value = swirl.strength;
    renderer.render(scene, camera);
    wake();
  }

  // Loudness (0..1) of each band, or null while there is nothing to show.
  function bandLevels() {
    const analyser = getAnalyser();
    if (!analyser) return null;
    if (bins?.length !== analyser.frequencyBinCount) bins = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(bins);
    const hzPerBin = analyser.context.sampleRate / analyser.fftSize;
    const tiltPerOctave = TILT_DB_PER_OCTAVE / (analyser.maxDecibels - analyser.minDecibels);
    const bands = Array.from({ length: BANDS }, (_, i) => {
      const from = Math.floor(bandEdgeHz(i) / hzPerBin);
      const to = Math.max(from + 1, Math.floor(bandEdgeHz(i + 1) / hzPerBin));
      let sum = 0;
      for (let b = from; b < to; b++) sum += bins[b];
      // Bins below the analyser's floor read 0 and stay silent.
      const level = sum / (to - from) / 255;
      const tilt = level && tiltPerOctave * Math.log2(bandEdgeHz(i) / BAND_HZ.min);
      return Math.min(1, level + tilt) ** CONTRAST;
    });
    const levels = bands.map((_, i) => {
      const near = bands.slice(Math.max(0, i - SPREAD), Math.min(BANDS, i + SPREAD + 1));
      return near.reduce((a, b) => a + b) / near.length;
    });
    return levels.some((level) => level > 0) ? levels : null;
  }

  return { place, setColor, setSwirl, setAir, wake };
}
