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
 * @typedef {Object} AerosolRecord
 * @property {string} time ISO UTC timestamp
 * @property {number} viewLat latitude of the view centre
 * @property {number} viewLon longitude of the view centre
 * @property {AerosolStem} seaSalt
 * @property {AerosolStem} dust
 * @property {AerosolStem} smoke
 * @property {AerosolStem} sulfate
 * @property {number|null} erinWindKt Erin's max sustained wind in knots (if present)
 */

/**
 * Parses an exported aerosol CSV file into structured records.
 *
 * @param {string} text
 * @returns {AerosolRecord[]}
 */
export function parseAerosolCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  const colIdx = (name) => cols.indexOf(name);

  const idxTime = colIdx("time");
  const idxViewLat = colIdx("view_lat");
  const idxViewLon = colIdx("view_lon");

  const idxSaltAod = colIdx("sea_salt_aod");
  const idxSaltN = colIdx("sea_salt_north_deg");
  const idxSaltE = colIdx("sea_salt_east_deg");
  const idxSaltV = colIdx("sea_salt_speed_m_s");

  const idxDustAod = colIdx("dust_aod");
  const idxDustN = colIdx("dust_north_deg");
  const idxDustE = colIdx("dust_east_deg");
  const idxDustV = colIdx("dust_speed_m_s");

  const idxSmokeAod = colIdx("smoke_aod");
  const idxSmokeN = colIdx("smoke_north_deg");
  const idxSmokeE = colIdx("smoke_east_deg");
  const idxSmokeV = colIdx("smoke_speed_m_s");

  const idxSulfAod = colIdx("sulfate_aod");
  const idxSulfN = colIdx("sulfate_north_deg");
  const idxSulfE = colIdx("sulfate_east_deg");
  const idxSulfV = colIdx("sulfate_speed_m_s");

  const idxWind = colIdx("erin_wind_kt");

  return lines.map((line) => {
    const c = line.split(",");
    return {
      time: c[idxTime],
      viewLat: Number(c[idxViewLat]),
      viewLon: Number(c[idxViewLon]),
      seaSalt: {
        aod: Number(c[idxSaltAod]),
        northDeg: Number(c[idxSaltN]),
        eastDeg: Number(c[idxSaltE]),
        speed: Number(c[idxSaltV]),
      },
      dust: {
        aod: Number(c[idxDustAod]),
        northDeg: Number(c[idxDustN]),
        eastDeg: Number(c[idxDustE]),
        speed: Number(c[idxDustV]),
      },
      smoke: {
        aod: Number(c[idxSmokeAod]),
        northDeg: Number(c[idxSmokeN]),
        eastDeg: Number(c[idxSmokeE]),
        speed: Number(c[idxSmokeV]),
      },
      sulfate: {
        aod: Number(c[idxSulfAod]),
        northDeg: Number(c[idxSulfN]),
        eastDeg: Number(c[idxSulfE]),
        speed: Number(c[idxSulfV]),
      },
      erinWindKt: idxWind >= 0 && c[idxWind] !== undefined ? Number(c[idxWind]) : null,
    };
  });
}

/**
 * Samples the aerosol state at a given progress (0..1) through the track.
 *
 * @param {AerosolRecord[]} records
 * @param {number} progress 0..1
 * @returns {{ current: AerosolRecord, next: AerosolRecord, alpha: number, index: number }}
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
