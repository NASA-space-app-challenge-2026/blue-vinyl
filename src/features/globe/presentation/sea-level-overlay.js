// The label is the porthole of SVS 5235: the first year's sea level sits BASE of the way up, and the water rises SPAN
// of the label height per SCALE_MM. Heights are shares of the label height.
const BASE = 0.14;
const SPAN = 0.3;
const SCALE_MM = 100;
// Ruler: 0 to 11 cm, a tick every centimetre, a label every 5.
const RULER_TOP_MM = 110;
const TICK_MM = 10;
const LABEL_EVERY_MM = 50;
// One wave of the surface (px). The water's top edge is cut to this shape, so the surface has no straight line.
const WAVE = Object.freeze({ width: 160, height: 12, amplitude: 3.5 });
const SWELL = Object.freeze({ width: 230, height: 16, amplitude: 5 });

/**
 * What the overlay shows at one moment.
 *
 * @typedef {Object} SeaLevelFrame
 * @property {number} year
 * @property {number} firstYear the year the sea level is measured from
 * @property {number} extent sea ice extent, million km²
 * @property {number} firstExtent sea ice extent of the first year, million km²
 * @property {number} seaLevelMm measured sea level of the year, change since the first year
 * @property {number} waterMm level of the water, which moves smoothly from one year's value to the next
 */

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const heightOf = (mm) => BASE + (mm / SCALE_MM) * SPAN;
const percent = (share) => `${share * 100}%`;

// One period of a sine wave, filled below the curve, as a CSS mask image that tiles across.
function waveMask({ width, height, amplitude }) {
  const points = [];
  for (let x = 0; x <= width; x += 4) {
    points.push(`${x} ${(height / 2 - amplitude * Math.sin((x / width) * 2 * Math.PI)).toFixed(2)}`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
    + `<path d="M0 ${height} L${points.join(' L')} L${width} ${height} Z"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Text and water over the globe. The year and its ice sit at the top. Below, the label becomes the porthole of SVS
 * 5235: water with a moving surface rises past a centimetre ruler. The ruler marks the first year's sea level, and
 * the measured rise of this year (such as +71 mm) is written beside it at that height; it moves a year at a time,
 * while the water moves smoothly. The overlay never takes pointer events, so the globe stays draggable.
 *
 * @param {HTMLElement} container
 */
export function createSeaLevelOverlay(container) {
  const root = el('div', 'sea-overlay');
  root.setAttribute('aria-hidden', 'true');
  root.hidden = true;

  // The sea reaches half a wave above the level, so the level is the middle of the surface.
  const sea = el('div', 'sea-overlay-sea');
  const swell = el('div', 'sea-overlay-swell');
  const water = el('div', 'sea-overlay-water');
  water.append(el('div', 'sea-overlay-rays'));
  sea.append(swell, water);
  for (const [node, wave] of [[water, WAVE], [swell, SWELL]]) {
    node.style.setProperty('--wave-mask', waveMask(wave));
    node.style.setProperty('--wave-w', `${wave.width}px`);
    node.style.setProperty('--wave-h', `${wave.height}px`);
  }

  const ruler = el('div', 'sea-overlay-ruler');
  ruler.style.bottom = percent(heightOf(0));
  ruler.style.height = percent(heightOf(RULER_TOP_MM) - heightOf(0));
  for (let mm = 0; mm <= RULER_TOP_MM; mm += TICK_MM) {
    const major = mm % LABEL_EVERY_MM === 0;
    const tick = el('span', `sea-overlay-tick${major ? ' is-major' : ''}`);
    if (major) tick.append(el('span', 'sea-overlay-tick-label', `${mm / 10} cm`));
    tick.style.bottom = percent(mm / RULER_TOP_MM);
    ruler.append(tick);
  }

  // Spans the ruler from the first year's level to this year's; it only places the two readings beside the ruler.
  const reading = el('div', 'sea-overlay-reading');
  reading.style.bottom = percent(heightOf(0));
  const readingFrom = el('span', 'sea-overlay-reading-label sea-overlay-reading-from');
  const readingTo = el('span', 'sea-overlay-reading-label sea-overlay-reading-to');
  reading.append(readingFrom, readingTo);

  const year = el('p', 'sea-overlay-year');
  const ice = el('p', 'sea-overlay-ice');
  const iceArea = el('span', 'sea-overlay-ice-line');
  const iceChange = el('span', 'sea-overlay-ice-line');
  ice.append(iceArea, iceChange);
  root.append(sea, ruler, reading, year, ice);
  container.append(root);

  /** @param {SeaLevelFrame | null} frame null hides the overlay */
  function render(frame) {
    root.hidden = frame === null;
    if (!frame) return;
    sea.style.height = `calc(${percent(heightOf(frame.waterMm))} + ${WAVE.height / 2}px)`;
    reading.style.height = percent(Math.max(0, heightOf(frame.seaLevelMm) - heightOf(0)));
    readingFrom.textContent = `${frame.firstYear} sea level`;
    const rise = `${frame.seaLevelMm >= 0 ? '+' : '−'}${Math.abs(frame.seaLevelMm).toFixed(0)} mm`;
    readingTo.textContent = frame.year === frame.firstYear ? '' : rise;
    year.textContent = String(frame.year);
    // Like the sea level, the ice is read against the first year: the share it has shrunk (or grown) by since.
    iceArea.textContent = `Sea ice ${frame.extent.toFixed(2)} million km²`;
    const change = Math.round((frame.extent / frame.firstExtent - 1) * 100);
    iceChange.textContent = frame.year === frame.firstYear
      ? ''
      : `${change >= 0 ? '+' : '−'}${Math.abs(change)}% since ${frame.firstYear}`;
  }

  /** Height of the water surface above the bottom of the label for a level (mm), as a share of the label height. */
  function waterLine(mm) {
    return heightOf(mm);
  }

  return { render, waterLine };
}
