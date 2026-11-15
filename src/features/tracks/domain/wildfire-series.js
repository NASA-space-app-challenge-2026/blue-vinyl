/**
 * Series the wildfire album plays (see data/wildfire/tracks/tracks.json and docs/albums/wildfire.md).
 */

/**
 * @typedef {Object} WildfireYear
 * @property {number} year
 * @property {number} fires
 * @property {number} acres
 * @property {number} acresPerFire
 * @property {boolean} isTop10 one of the ten largest-acre years (EIC 5453)
 */

/**
 * @typedef {Object} WildfireDay
 * @property {string} day ISO date
 * @property {number} nFires
 * @property {number} areaKm2
 * @property {number} flinelen
 * @property {number} meanfrp
 * @property {number} lon
 * @property {number} lat
 */

/**
 * One large fire through the season: where it is, and its size and how hard it burned on each day of the season.
 *
 * @typedef {Object} WildfireFire
 * @property {string} fireid
 * @property {number} lon of its largest perimeter's centroid
 * @property {number} lat
 * @property {Float32Array} areaKm2 by day index: its largest perimeter so far (0 before it is seen), so a scar stays
 * @property {Float32Array} newPixels by day index: newly burning VIIRS pixels seen that day (0 on days it was not seen)
 */

/**
 * One large fire MTBS mapped, in the year it started.
 *
 * @typedef {Object} WildfireYearFire
 * @property {string} fireid unique across the years
 * @property {number} lon of a point inside its burned area
 * @property {number} lat
 * @property {number} areaKm2 its burned area
 * @property {number} yearShare how far into the year it started, 0 (1 January) to 1
 */

const KM2_PER_ACRE = 0.0040468564224;

/** @param {string} text */
export function parseAnnualCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  const i = Object.fromEntries(header.map((name, index) => [name, index]));
  /** @type {WildfireYear[]} */
  const years = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    const top = String(cells[i.is_top10] ?? '').toLowerCase();
    years.push({
      year: Number(cells[i.Year]),
      fires: Number(cells[i.Fires]),
      acres: Number(cells[i.Acres]),
      acresPerFire: Number(cells[i.acres_per_fire]),
      isTop10: top === 'true' || top === '1',
    });
  }
  return years;
}

/**
 * Reads the large-fires file (one row per MTBS fire, by year and ignition date) into each year's fires, laid out on
 * `years`; a year MTBS has no fires for (1983, before it starts) gets none.
 *
 * @param {string} text
 * @param {WildfireYear[]} years
 * @returns {WildfireYearFire[][]} by year index
 */
export function parseYearFiresCsv(text, years) {
  const yearIndex = new Map(years.map(({ year }, index) => [year, index]));
  const byYear = years.map(() => []);
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  const i = Object.fromEntries(header.map((name, index) => [name, index]));
  lines.slice(1).forEach((line, row) => {
    const cells = line.split(',');
    const year = Number(cells[i.year]);
    const at = yearIndex.get(year);
    if (at === undefined) return;
    const start = Date.UTC(year, 0, 1);
    const yearMs = Date.UTC(year + 1, 0, 1) - start;
    byYear[at].push({
      fireid: `mtbs-${row}`,
      lon: Number(cells[i.lon]),
      lat: Number(cells[i.lat]),
      areaKm2: Number(cells[i.acres]) * KM2_PER_ACRE,
      yearShare: Math.min(1, Math.max(0, (Date.parse(`${cells[i.ig_date]}T00:00:00Z`) - start) / yearMs)),
    });
  });
  return byYear;
}

/** @param {string} text */
export function parseDailyCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  const i = Object.fromEntries(header.map((name, index) => [name, index]));
  /** @type {WildfireDay[]} */
  const days = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    days.push({
      day: cells[i.day].slice(0, 10),
      nFires: Number(cells[i.n_fires]),
      areaKm2: Number(cells[i.area_km2]),
      flinelen: Number(cells[i.flinelen]),
      meanfrp: Number(cells[i.meanfrp]),
      lon: Number(cells[i.lon]),
      lat: Number(cells[i.lat]),
    });
  }
  return days;
}

/**
 * Reads the fire-days file (one row per fire and day) into one entry per fire, laid out on `days`.
 *
 * @param {string} text
 * @param {WildfireDay[]} days the season's days, in order
 * @returns {WildfireFire[]}
 */
export function parseFireDaysCsv(text, days) {
  const dayIndex = new Map(days.map(({ day }, index) => [day, index]));
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  const i = Object.fromEntries(header.map((name, index) => [name, index]));
  /** @type {Map<string, WildfireFire>} */
  const fires = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    const at = dayIndex.get(cells[i.day].slice(0, 10));
    if (at === undefined) continue;
    const fireid = cells[i.fireid];
    if (!fires.has(fireid)) {
      fires.set(fireid, {
        fireid,
        lon: Number(cells[i.lon]),
        lat: Number(cells[i.lat]),
        areaKm2: new Float32Array(days.length),
        newPixels: new Float32Array(days.length),
      });
    }
    const fire = fires.get(fireid);
    fire.areaKm2[at] = Number(cells[i.area_km2]);
    fire.newPixels[at] = Number(cells[i.new_pixels]);
  }
  // A burned area does not shrink back: carry each fire's largest size forward.
  for (const fire of fires.values()) {
    for (let d = 1; d < days.length; d++) fire.areaKm2[d] = Math.max(fire.areaKm2[d], fire.areaKm2[d - 1]);
  }
  return [...fires.values()];
}

// Newly burning pixels a day at which a fire burns at full heat.
const FULL_HEAT_PIXELS = 3000;

/**
 * How hot a fire burns on a day (0..1) from the VIIRS pixels newly burning in it: the globe draws its front, embers and
 * smoke this bright, and the music plays the season's fire from the same number.
 *
 * @param {number} newPixels
 */
export function fireHeat(newPixels) {
  return Math.min(1, Math.sqrt(newPixels / FULL_HEAT_PIXELS));
}

/**
 * The season's fire as the globe shows it, day by day.
 *
 * @typedef {Object} WildfireSeasonDay
 * @property {number} burning the heat of every fire burning that day, summed (how much fire the globe shows)
 * @property {number} burnedKm2 every fire's scar so far, summed (never shrinks)
 * @property {number} lon the burning fires' longitude, weighted by heat (0 when nothing burns)
 * @property {{ lon: number, areaKm2: number }[]} ignitions the fires whose scar first shows that day
 */

/**
 * @param {WildfireFire[]} fires
 * @param {number} dayCount
 * @returns {WildfireSeasonDay[]}
 */
export function seasonDays(fires, dayCount) {
  return Array.from({ length: dayCount }, (_, d) => {
    let burning = 0;
    let burnedKm2 = 0;
    let lonSum = 0;
    const ignitions = [];
    for (const fire of fires) {
      const heat = fireHeat(fire.newPixels[d]);
      burning += heat;
      lonSum += heat * fire.lon;
      burnedKm2 += fire.areaKm2[d];
      if (fire.areaKm2[d] > 0 && (d === 0 || fire.areaKm2[d - 1] === 0)) {
        ignitions.push({ lon: fire.lon, areaKm2: fire.areaKm2[d] });
      }
    }
    return { burning, burnedKm2, lon: burning > 0 ? lonSum / burning : 0, ignitions };
  });
}
