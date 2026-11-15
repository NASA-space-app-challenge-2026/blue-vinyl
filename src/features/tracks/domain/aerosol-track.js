/**
 * One 3-hour timestep of an aerosol track from NASA GMAO GEOS-FP.
 *
 * @typedef {Object} AerosolStem
 * @property {number} aod centre-weighted aerosol optical depth at 550nm
 * @property {number} northDeg degrees north of the view centre
 * @property {number} eastDeg degrees east of the view centre
 * @property {number} speed m/s particle speed (mass flux over mass)
 */

/**
 * One event of a track in one timestep: the plume of one particle type connected to its source, and how near it
 * comes to a distant receptor (see section 9.4 of notebooks/aerosol_album.ipynb).
 *
 * @typedef {Object} AerosolPlume
 * @property {number} sourceAod AOD near the source: how strong the event is
 * @property {number} receptorAod AOD at the receptor: what arrives there
 * @property {number} reachKm how far the plume has spread from the source, in any direction
 * @property {number} areaMillionKm2 the plume's area
 * @property {number} frontLat latitude of the plume's point nearest the receptor
 * @property {number} frontLon longitude of that point
 * @property {number} frontToReceptorKm from that point to the receptor
 */

/**
 * @typedef {'seaSalt' | 'dust' | 'smoke' | 'sulfate'} Particle
 */

/**
 * @typedef {Object} AerosolRecord
 * @property {string} time ISO UTC timestamp
 * @property {number} viewLat latitude of the view centre
 * @property {number} viewLon longitude of the view centre
 * @property {AerosolStem} seaSalt
 * @property {AerosolStem} dust
 * @property {AerosolStem} smoke
 * @property {AerosolStem} sulfate
 * @property {Partial<Record<Particle, AerosolPlume>>} plumes the track's events, by particle type
 * @property {number|null} erinWindKt Erin's max sustained wind in knots (if present)
 */

// CSV column prefix of each particle type.
const PARTICLE_COLUMNS = Object.freeze({ seaSalt: 'sea_salt', dust: 'dust', smoke: 'smoke', sulfate: 'sulfate' });

const PLUME_COLUMNS = Object.freeze({
  sourceAod: 'source_aod',
  receptorAod: 'receptor_aod',
  reachKm: 'reach_km',
  areaMillionKm2: 'area_million_km2',
  frontLat: 'front_lat',
  frontLon: 'front_lon',
  frontToReceptorKm: 'front_to_receptor_km',
});

/**
 * Parses an exported aerosol CSV file into structured records.
 *
 * @param {string} text
 * @returns {AerosolRecord[]}
 */
export function parseAerosolCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const index = new Map(header.split(',').map((name, i) => [name, i]));
  const plumeParticles = Object.entries(PARTICLE_COLUMNS).filter(([, p]) => index.has(`${p}_reach_km`));

  return lines.map((line) => {
    const c = line.split(',');
    const num = (name) => Number(c[index.get(name)]);
    const stem = (p) => ({
      aod: num(`${p}_aod`),
      northDeg: num(`${p}_north_deg`),
      eastDeg: num(`${p}_east_deg`),
      speed: num(`${p}_speed_m_s`),
    });
    const plumes = {};
    for (const [particle, p] of plumeParticles) {
      plumes[particle] = Object.fromEntries(Object.entries(PLUME_COLUMNS).map(([key, col]) => [key, num(`${p}_${col}`)]));
    }
    return {
      time: c[index.get('time')],
      viewLat: num('view_lat'),
      viewLon: num('view_lon'),
      seaSalt: stem(PARTICLE_COLUMNS.seaSalt),
      dust: stem(PARTICLE_COLUMNS.dust),
      smoke: stem(PARTICLE_COLUMNS.smoke),
      sulfate: stem(PARTICLE_COLUMNS.sulfate),
      plumes,
      erinWindKt: index.has('erin_wind_kt') ? num('erin_wind_kt') : null,
    };
  });
}

/**
 * Samples the aerosol state at a given progress (0..1) through the track.
 *
 * @param {AerosolRecord[]} records
 * @param {number} progress 0..1
 * @returns {{ current: AerosolRecord, next: AerosolRecord, alpha: number, index: number } | null}
 */
export function sampleAerosol(records, progress) {
  if (!records || records.length === 0) return null;
  const clamped = Math.max(0, Math.min(1, progress));
  const pos = clamped * (records.length - 1);
  const index = Math.floor(pos);
  const nextIndex = Math.min(records.length - 1, index + 1);
  const alpha = pos - index;
  return {
    current: records[index],
    next: records[nextIndex],
    alpha,
    index,
  };
}
