// The paths the aerosol globe draws: where each particle goes, from the file the aerosol paths notebook exports
// (notebooks/aerosol_paths.ipynb, section 6). Every particle is carried by its own particle type's wind from where it is
// released; nothing is steered.

/** The most particles a track draws; the notebook keeps to it and so does the loader. */
export const MAX_PARTICLES = 200;

/** How many steps of its path (3 hours each) a particle draws brightly behind its head. */
export const TAIL_STEPS = 24;

/**
 * @typedef {'seaSalt' | 'dust' | 'smoke' | 'sulfate'} AerosolParticle
 */

/**
 * @typedef {Object} AerosolParticlePath
 * @property {AerosolParticle} particle
 * @property {boolean} [hero] the track's lead particle: the one the globe circles and the camera follows
 * @property {number} release the step the particle is released at (a step is a row of the track's CSV)
 * @property {[number, number][]} path latitude and longitude of every step from the release; the longitude does not
 *   jump across the date line
 */

/**
 * @param {unknown} json what the notebook wrote
 * @returns {AerosolParticlePath[]}
 */
export function parseAerosolPaths(json) {
  const { particles } = json;
  if (!Array.isArray(particles)) throw new Error('aerosol paths: no particles');
  if (particles.length > MAX_PARTICLES) throw new Error(`aerosol paths: ${particles.length} particles, at most ${MAX_PARTICLES}`);
  return particles;
}

/** The point `at` steps along a path (0 to length - 1), between the two steps it lies between. */
function pointAt(path, at) {
  const i = Math.min(Math.floor(at), path.length - 2);
  const f = at - i;
  return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f];
}

/**
 * Where a particle's head is at a step: its release point before it is released, its end once its path is done.
 *
 * @param {AerosolParticlePath} particle
 * @param {number} step
 * @returns {[number, number]}
 */
export function headOf({ release, path }, step) {
  return pointAt(path, Math.max(0, Math.min(step - release, path.length - 1)));
}

/** The view arc (degrees from the focus to the edge of the label) that keeps the lead particles in frame. */
export const HERO_ARC_DEG = Object.freeze({ close: 26, wide: 75 });
// Padding round the lead particles when there are several, as a share of their spread.
const SPREAD_PAD = 1.8;

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const unit = ([lat, lon]) => [Math.cos(rad(lat)) * Math.cos(rad(lon)), Math.cos(rad(lat)) * Math.sin(rad(lon)), Math.sin(rad(lat))];

/**
 * Where the camera should look at a step: the lead particles' heads (their release point until released, their end once
 * their path is done), zoomed close on them, or wider when several are far apart. Null until one is released.
 *
 * @param {AerosolParticlePath[]} particles
 * @param {number} step
 * @returns {{ lat: number, lon: number, arcDeg: number } | null}
 */
export function heroFocus(particles, step) {
  const heroes = particles.filter((p) => p.hero);
  if (!heroes.some((p) => step >= p.release)) return null;
  const heads = heroes.map((p) => unit(headOf(p, step)));
  const sum = heads.reduce((a, v) => a.map((x, i) => x + v[i]), [0, 0, 0]);
  const norm = Math.hypot(...sum) || 1;
  const centre = sum.map((x) => x / norm);
  const spreadDeg = Math.max(...heads.map((v) => deg(Math.acos(Math.min(1, centre.reduce((s, x, i) => s + x * v[i], 0))))));
  const arcDeg = Math.min(HERO_ARC_DEG.wide, Math.max(HERO_ARC_DEG.close, spreadDeg * SPREAD_PAD + HERO_ARC_DEG.close * 0.5));
  return { lat: deg(Math.asin(centre[2])), lon: deg(Math.atan2(centre[1], centre[0])), arcDeg };
}
