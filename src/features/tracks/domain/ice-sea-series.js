/**
 * One year of a polar track: the pole's sea ice and the global mean sea level (see docs/data-guide.md and
 * data/glacier/tracks/tracks.json).
 *
 * @typedef {Object} IceSeaYear
 * @property {number} year
 * @property {number} extent sea ice extent, million km²
 * @property {number} normal 1981–2010 average extent of the same month, million km²
 * @property {boolean} recordLow lower than every earlier year since 1979
 * @property {number} seaLevelMm global mean sea level, change since the first year (mm)
 */

const COLUMNS = Object.freeze({
  extent: 'extent_million_km2',
  normal: 'normal_1981_2010_million_km2',
  recordLow: 'record_low',
  seaLevelMm: 'sea_level_change_mm',
});

/**
 * Parses a track CSV exported by the album notebook: a header row, then one row per year with an ISO date first.
 *
 * @param {string} text
 * @returns {IceSeaYear[]}
 */
export function parseIceSeaCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split(',');
  const at = (name) => {
    const index = columns.indexOf(name);
    if (index < 0) throw new Error(`Track data has no column "${name}"`);
    return index;
  };
  const index = Object.fromEntries(Object.entries(COLUMNS).map(([key, name]) => [key, at(name)]));
  return lines.map((line) => {
    const cells = line.split(',');
    return {
      year: Number(cells[0].slice(0, 4)),
      extent: Number(cells[index.extent]),
      normal: Number(cells[index.normal]),
      recordLow: cells[index.recordLow] === '1',
      seaLevelMm: Number(cells[index.seaLevelMm]),
    };
  });
}
