// Water rises from the bottom of the label in proportion to sea level, up to this share of its height.
const WATER_MAX_SHARE = 0.32;
const TICK_MM = 20;

/**
 * What the overlay shows for one year.
 *
 * @typedef {Object} SeaLevelFrame
 * @property {number} year
 * @property {number} extent sea ice extent, million km²
 * @property {number} normal 1981–2010 normal, million km²
 * @property {number} seaLevelMm global mean sea level, change since the first year
 */

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Text and water over the globe: the year and its ice, and water rising from the bottom of the label with a mm
 * ruler, like the porthole of SVS 5235. It never takes pointer events, so the globe stays draggable.
 *
 * @param {HTMLElement} container
 * @param {{ maxMm: number }} options top of the ruler
 */
export function createSeaLevelOverlay(container, { maxMm }) {
  const root = el('div', 'sea-overlay');
  root.setAttribute('aria-hidden', 'true');
  root.hidden = true;
  const water = el('div', 'sea-overlay-water');
  const level = el('span', 'sea-overlay-level');
  const ruler = el('div', 'sea-overlay-ruler');
  const ticks = [];
  for (let mm = TICK_MM; mm <= maxMm; mm += TICK_MM) {
    const tick = el('span', 'sea-overlay-tick', mm + TICK_MM > maxMm ? `${mm} mm` : String(mm));
    tick.style.bottom = `${(mm / maxMm) * WATER_MAX_SHARE * 100}%`;
    ticks.push({ mm, tick });
    ruler.append(tick);
  }
  const year = el('p', 'sea-overlay-year');
  const ice = el('p', 'sea-overlay-ice');
  water.append(level);
  root.append(water, ruler, year, ice);
  container.append(root);

  /** @param {SeaLevelFrame | null} frame null hides the overlay */
  function render(frame) {
    root.hidden = frame === null;
    if (!frame) return;
    const share = Math.min(Math.max(frame.seaLevelMm, 0), maxMm) / maxMm;
    water.style.height = `${share * WATER_MAX_SHARE * 100}%`;
    level.textContent = `${frame.seaLevelMm >= 0 ? '+' : ''}${frame.seaLevelMm.toFixed(0)} mm`;
    for (const { mm, tick } of ticks) tick.classList.toggle('is-reached', frame.seaLevelMm >= mm);
    year.textContent = String(frame.year);
    const change = Math.round((frame.extent / frame.normal - 1) * 100);
    const versus = change === 0 ? 'at the 1981–2010 normal' : `${Math.abs(change)}% ${change < 0 ? 'below' : 'above'} 1981–2010`;
    ice.textContent = `${frame.extent.toFixed(2)} million km² · ${versus}`;
  }

  return { render };
}
