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
 * @property {number} normal 1981–2010 normal, million km²
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
 * 5235: water with a moving surface rises past a centimetre ruler, and a blue mark spans the rise from the first
 * year's sea level to the measured level of this year. As in 5235, the mark shows the measurement and moves a year
 * at a time, while the water moves smoothly. The overlay never takes pointer events, so the globe stays draggable.
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

  const mark = el('div', 'sea-overlay-mark');
  mark.style.bottom = percent(heightOf(0));
  const markFrom = el('span', 'sea-overlay-mark-label sea-overlay-mark-from');
  const markTo = el('span', 'sea-overlay-mark-label sea-overlay-mark-to');
  mark.append(markFrom, markTo);

  const year = el('p', 'sea-overlay-year');
  const ice = el('p', 'sea-overlay-ice');
  root.append(sea, ruler, mark, year, ice);
  container.append(root);

  /** @param {SeaLevelFrame | null} frame null hides the overlay */
  function render(frame) {
    root.hidden = frame === null;
    if (!frame) return;
    sea.style.height = `calc(${percent(heightOf(frame.waterMm))} + ${WAVE.height / 2}px)`;
    mark.style.height = percent(Math.max(0, heightOf(frame.seaLevelMm) - heightOf(0)));
    markFrom.textContent = `${frame.firstYear} sea level`;
    const rise = `${frame.seaLevelMm >= 0 ? '+' : '−'}${Math.abs(frame.seaLevelMm).toFixed(0)} mm`;
    markTo.textContent = frame.year === frame.firstYear ? '' : `${frame.year} sea level ${rise}`;
    year.textContent = String(frame.year);
    const change = Math.round((frame.extent / frame.normal - 1) * 100);
    const versus = change === 0 ? 'at the 1981–2010 normal' : `${Math.abs(change)}% ${change < 0 ? 'below' : 'above'} 1981–2010`;
    ice.textContent = `Sea ice ${frame.extent.toFixed(2)} million km² · ${versus}`;
  }

  return { render };
}
