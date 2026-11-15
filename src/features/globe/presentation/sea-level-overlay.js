// The label is the porthole of SVS 5235: the first year's sea level sits BASE of the way up, and the water rises SPAN
// of the label height per SCALE_MM. Heights are shares of the label height.
const BASE = 0.14;
const SPAN = 0.3;
const SCALE_MM = 100;
// One wave of the surface (px). The water's top edge is cut to this shape, so the surface has no straight line.
const WAVE = Object.freeze({ width: 160, height: 12, amplitude: 3.5 });
const SWELL = Object.freeze({ width: 230, height: 16, amplitude: 5 });
// The swell and the sky over the water are each masked by one image of whole waves, just wider than what it masks (the
// label plus a wave), rather than by one wave tiled: phones leave hairline cracks between the tiles. Not wider, as
// Safari leaves gaps in a mask image too large for it.

/**
 * What the overlay shows at one moment.
 *
 * @typedef {Object} SeaLevelFrame
 * @property {number} year
 * @property {number} waterMm level of the water, which moves smoothly from one year's value to the next
 */

function el(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

const heightOf = (mm) => BASE + (mm / SCALE_MM) * SPAN;

// `periods` periods of a sine wave each `width` across, as SVG path points, its middle `top` px below the image's top
// edge.
function crest({ width, height, amplitude }, top = 0, periods = 1) {
  // About every 4 px, ending exactly on the last period's right edge, so the curve meets the next tile with no notch.
  const steps = Math.ceil(width / 4);
  const points = [];
  for (let k = 0; k <= steps * periods; k++) {
    const x = (k / steps) * width;
    points.push(`${x.toFixed(2)} ${(top + height / 2 - amplitude * Math.sin((k / steps) * 2 * Math.PI)).toFixed(2)}`);
  }
  return points.join(' L');
}

// How many whole waves of `wave` an untiled mask over a label `labelPx` wide holds, and how wide that is (px): the
// label, the wave it moves along by, and one more for rounding.
function untiled(wave, labelPx) {
  const periods = Math.ceil(labelPx / wave.width) + 2;
  return { periods, width: periods * wave.width };
}

const svgImage = (svg) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"${svg}</svg>`)}")`;

// The waves over a label `labelPx` wide, filled below the curve, as one CSS mask image (see untiled).
function waveMask(wave, labelPx) {
  const { height } = wave;
  const { periods, width } = untiled(wave, labelPx);
  return svgImage(` width="${width}" height="${height}"><path d="M0 ${height} L${crest(wave, 0, periods)} L${width} ${height} Z"/>`);
}

// The water as one shape: a period of the wave with the water filled below it all the way down. The image has no
// size of its own, so it fills whatever height it is given; the body overlaps the wave where both are solid, so the
// two leave no seam.
function waterMask(wave) {
  const { width, height } = wave;
  return svgImage(`><path d="M0 ${height} L${crest(wave)} L${width} ${height} Z"/>`
    + `<rect y="${height - 1}" width="${width}" height="100%"/>`);
}

// Everything above the waves, from `top` px over them: where the swell may show without lying under the water. One
// image over a label `labelPx` wide (see untiled).
function aboveMask(wave, top, labelPx) {
  const { height } = wave;
  const { periods, width } = untiled(wave, labelPx);
  return svgImage(` width="${width}" height="${top + height}"><path d="M0 0 L${crest(wave, top, periods)} L${width} 0 Z"/>`);
}

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

/**
 * The year and the water over the globe. The year sits at the top; below, the label becomes the porthole of SVS 5235,
 * where water with a moving surface rises smoothly with the sea level. The overlay never takes pointer events, so the
 * globe stays draggable.
 *
 * @param {HTMLElement} container
 */
export function createSeaLevelOverlay(container) {
  const root = el('div', 'sea-overlay');
  root.setAttribute('aria-hidden', 'true');
  root.hidden = true;

  // The sea is as tall as the label and is moved up and down, so it never changes size; its top is half a wave above
  // the level, so the level is the middle of the surface. The drift carries the water's wave along; the swell and the
  // rays sit in holds that move back as far, so they keep their own motion. The swell shows only above the water.
  const sea = el('div', 'sea-overlay-sea');
  const drift = el('div', 'sea-overlay-drift');
  const swellClip = el('div', 'sea-overlay-swell-clip');
  const swellHold = el('div', 'sea-overlay-hold');
  swellHold.append(el('div', 'sea-overlay-swell'));
  swellClip.append(swellHold);
  const water = el('div', 'sea-overlay-water');
  const depth = el('div', 'sea-overlay-depth');
  const raysHold = el('div', 'sea-overlay-hold');
  const raysFade = el('div', 'sea-overlay-rays-fade');
  const rays = el('div', 'sea-overlay-rays');
  raysFade.append(rays);
  raysHold.append(raysFade);
  water.append(depth, raysHold);
  drift.append(swellClip, water);
  sea.append(drift);
  const swellTop = SWELL.height / 3;
  for (const [name, value] of [
    ['--wave-w', `${WAVE.width}px`],
    ['--wave-h', `${WAVE.height}px`],
    ['--swell-w', `${SWELL.width}px`],
    ['--swell-h', `${SWELL.height}px`],
    ['--swell-top', `${swellTop}px`],
    ['--water-mask', waterMask(WAVE)],
  ]) {
    root.style.setProperty(name, value);
  }
  // The label width the swell's masks are drawn for.
  let maskedPx = null;
  function setSwellMasks(labelPx) {
    if (labelPx === maskedPx) return;
    maskedPx = labelPx;
    root.style.setProperty('--above-mask', aboveMask(WAVE, swellTop, labelPx));
    root.style.setProperty('--above-mask-w', `${untiled(WAVE, labelPx).width}px`);
    root.style.setProperty('--swell-mask', waveMask(SWELL, labelPx));
    root.style.setProperty('--swell-mask-w', `${untiled(SWELL, labelPx).width}px`);
  }
  // The label's height in pixels, kept here so drawing a frame never has to measure the page.
  let labelPx = 0;
  let waterShare = null;
  let shownWater = null;
  new ResizeObserver(() => {
    labelPx = root.clientHeight;
    setSwellMasks(root.clientWidth);
    if (waterShare !== null) placeWater(waterShare);
  }).observe(root);

  const year = el('p', 'sea-overlay-year');
  root.append(sea, year);
  container.append(root);

  /** @param {SeaLevelFrame | null} frame null hides the overlay */
  function render(frame) {
    root.hidden = frame === null;
    if (!frame) return;
    placeWater(heightOf(frame.waterMm));
    setText(year, String(frame.year));
  }

  // Moves the sea so its surface is `share` of the label up, and stretches the water's colour over the depth seen,
  // from the top of the wave to the bottom of the label. Only transforms change, so nothing is laid out or repainted.
  function placeWater(share) {
    waterShare = share;
    const key = `${share}:${labelPx}`;
    if (!labelPx || key === shownWater) return;
    shownWater = key;
    const top = (1 - share) * labelPx - WAVE.height / 2;
    const seen = (labelPx - top) / labelPx;
    sea.style.transform = `translateY(${top}px)`;
    depth.style.transform = `scaleY(${seen})`;
    // The rays fade over the depth seen too, but are not stretched themselves, so they keep their slant.
    raysFade.style.transform = `scaleY(${seen})`;
    rays.style.transform = `scaleY(${1 / seen})`;
  }

  /** Height of the water surface above the bottom of the label for a level (mm), as a share of the label height. */
  function waterLine(mm) {
    return heightOf(mm);
  }

  return { render, waterLine };
}
