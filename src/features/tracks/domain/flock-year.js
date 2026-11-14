// One species' flock through one year, all tracking years folded into one, as exported by
// notebooks/arctic_bird_album.ipynb (section 9) into data/arctic_bird/tracks/: one row per day.

export const FOLDED_YEAR_DAYS = 365;

// CSV column of each field; the unit is part of the column name.
const Column = Object.freeze({
  date: 'date',
  lat: 'lat_deg',
  lon: 'lon_deg',
  kmPerDay: 'km_per_day',
  birds: 'birds',
});

/**
 * @typedef {Object} FlockDay
 * @property {string} date  YYYY-MM-DD in the stand-in year
 * @property {number} lat   median latitude of the birds, degrees north
 * @property {number} lon   circular mean longitude of the birds, degrees east
 * @property {number} kmPerDay  distance the mean bird flies that day
 * @property {number} kmSoFar   distance the mean bird has flown since Jan 1, that day included
 * @property {number} birds number of birds tracked that day
 */

/**
 * @param {string} csv
 * @returns {FlockDay[]}
 */
export function parseFlockYear(csv) {
  const [header, ...lines] = csv.trim().split('\n');
  const names = header.split(',');
  const index = Object.fromEntries(Object.entries(Column).map(([field, column]) => [field, names.indexOf(column)]));
  const absent = Object.entries(index).filter(([, i]) => i < 0);
  if (absent.length) throw new Error(`flock CSV lacks ${absent.map(([field]) => Column[field]).join(', ')}`);
  if (lines.length !== FOLDED_YEAR_DAYS) throw new Error(`flock CSV has ${lines.length} days, not ${FOLDED_YEAR_DAYS}`);

  let kmSoFar = 0;
  return lines.map((line) => {
    const cells = line.split(',');
    const kmPerDay = Number(cells[index.kmPerDay]);
    kmSoFar += kmPerDay;
    return {
      date: cells[index.date],
      lat: Number(cells[index.lat]),
      lon: Number(cells[index.lon]),
      kmPerDay,
      kmSoFar,
      birds: Number(cells[index.birds]),
    };
  });
}

/**
 * Latitude change per day around `day`, measured over `windowDays` on each side (clamped to the year).
 *
 * @param {FlockDay[]} year
 * @param {number} day
 * @param {number} windowDays
 */
export function latPerDay(year, day, windowDays) {
  const from = Math.max(0, day - windowDays);
  const to = Math.min(year.length - 1, day + windowDays);
  return to > from ? (year[to].lat - year[from].lat) / (to - from) : 0;
}
