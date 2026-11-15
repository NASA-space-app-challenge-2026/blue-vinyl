// How an aerosol frame (data/aerosol/tracks/frames/*.png) is laid out, shared by the globe that draws it
// (globe/presentation/aerosol-layer.js) and the music that reads it (aodsAt). What the notebook wrote
// (notebooks/aerosol_album.ipynb, section "frame_png"): in the top half the log-encoded AOD of dust, sulfate and sea
// salt (R, G, B), in the bottom half that of smoke (R) and the east and north speed of the particles (G, B), each half
// north up.

/** How the frames are encoded and laid out: the AOD grid is 0.5° by 0.625°, its first column centred at 179.84375° W. */
export const FRAME = Object.freeze({
  cols: 576,
  rows: 361,
  stepLatDeg: 0.5,
  stepLonDeg: 0.625,
  firstLonDeg: -179.84375,
  aodLo: 0.01,
  aodHi: 3.0,
  speedMax: 40.0,
});

/** The AOD range EIC's colours and the music's loudness run over, on a log scale. */
export const EIC_AOD = Object.freeze({ lo: 0.03, hi: 1.0 });

/** Where a frame's code (0 to 1) is a real AOD. */
function decodeAod(code) {
  return FRAME.aodLo * (FRAME.aodHi / FRAME.aodLo) ** code;
}

/**
 * The AOD range the music's loudness runs over, on a log scale: EIC's high end, down to the lowest AOD a frame holds, so
 * air too thin for EIC's colours still sounds.
 */
export const SOUND_AOD = Object.freeze({ lo: FRAME.aodLo, hi: EIC_AOD.hi });

/**
 * How far up a log scale an AOD is, 0 (at or under its low end) to 1 (at or over its high end); by default EIC's, the
 * same as the globe's `level`.
 */
export function levelOf(aod, { lo, hi } = EIC_AOD) {
  const level = Math.log(Math.max(aod, 1e-6) / lo) / Math.log(hi / lo);
  return Math.min(1, Math.max(0, level));
}

/**
 * @typedef {Object} ParticleAods
 * @property {number} seaSalt
 * @property {number} dust
 * @property {number} smoke
 * @property {number} sulfate
 */

/**
 * The AOD of each particle type at a place in a frame, read from the four cells round it and blended as real values, not
 * as the 8-bit codes, as the globe's shader does.
 *
 * @param {Uint8ClampedArray} pixels the frame's pixels, `channels` bytes each, row by row
 * @param {number} channels bytes per pixel (3 or 4)
 * @param {number} lat
 * @param {number} lon
 * @returns {ParticleAods}
 */
export function aodsAt(pixels, channels, lat, lon) {
  const { cols, rows } = FRAME;
  const gx = (lon - FRAME.firstLonDeg) / FRAME.stepLonDeg;
  const gy = Math.min(Math.max((lat + 90) / FRAME.stepLatDeg, 0), rows - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.min(Math.floor(gy), rows - 2);
  const fx = gx - x0;
  const fy = gy - y0;
  const aods = { seaSalt: 0, dust: 0, smoke: 0, sulfate: 0 };
  const code = (row, col, channel) => pixels[(row * cols + col) * channels + channel] / 255;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const weight = (i === 0 ? 1 - fx : fx) * (j === 0 ? 1 - fy : fy);
      const col = (((x0 + i) % cols) + cols) % cols;
      const row = rows - 1 - (y0 + j); // north up: the top row is 90° N
      aods.dust += weight * decodeAod(code(row, col, 0));
      aods.sulfate += weight * decodeAod(code(row, col, 1));
      aods.seaSalt += weight * decodeAod(code(row, col, 2));
      aods.smoke += weight * decodeAod(code(rows + row, col, 0));
    }
  }
  return aods;
}
