// The paths the aerosol globe draws: where each particle goes, from the file the aerosol paths notebook exports
// (notebooks/aerosol_paths.ipynb, section 6). Every particle is carried by its own particle type's wind from where it is
// released; nothing is steered.

/** The most particles a track draws; the notebook keeps to it and so does the loader. */
export const MAX_PARTICLES = 30;

/** How many steps of its path (3 hours each) a particle draws behind its head, and a track's lead particle (`hero`). */
export const TAIL_STEPS = Object.freeze({ crowd: 24, hero: 48 });

/**
 * @typedef {'seaSalt' | 'dust' | 'smoke' | 'sulfate'} AerosolParticle
 */

/**
 * @typedef {Object} AerosolParticlePath
 * @property {AerosolParticle} particle
 * @property {boolean} [hero] the lead particle of its type on the track: the one that travels farthest
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
 * The part of a particle's path to draw at a step of the track: from its tail to its head, or null while it is not yet
 * released or once its tail has caught up with where its path ends.
 *
 * @param {AerosolParticlePath} particle
 * @param {number} step the track's time in steps, with a fraction between two of them
 * @returns {[number, number][] | null}
 */
export function visiblePath({ release, path, hero }, step) {
  const local = step - release;
  const head = Math.min(local, path.length - 1);
  const tail = Math.max(0, local - (hero ? TAIL_STEPS.hero : TAIL_STEPS.crowd));
  if (local <= 0 || tail >= head) return null;
  const points = [pointAt(path, tail)];
  for (let i = Math.floor(tail) + 1; i <= Math.floor(head); i++) points.push(path[i]);
  if (head > Math.floor(head)) points.push(pointAt(path, head));
  return points.length > 1 ? points : null;
}
