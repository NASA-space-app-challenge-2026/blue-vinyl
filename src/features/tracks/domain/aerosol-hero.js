// What the music of an aerosol track plays: the lead particle's way, and the air it goes through (the AOD of each
// particle type at the lead particle's head, step by step; see aodsAt in aerosol-frame.js).

import { headOf } from './aerosol-paths.js';
import { distanceKm } from './geo.js';

/**
 * @typedef {Object} HeroSample
 * @property {number} lat latitude of the lead particle
 * @property {number} east degrees east of where it was released
 * @property {number} speedKm how far it moves in a step (3 hours)
 * @property {import('./aerosol-frame.js').ParticleAods} aods the AOD of each particle type at its head
 */

/**
 * @typedef {Object} HeroSeries
 * @property {string} particle the lead particle's type
 * @property {HeroSample[]} samples one per step of the track
 * @property {{ min: number, max: number }} lat the latitudes it covers
 * @property {number} fastestKm its fastest step
 */

/**
 * @param {import('./aerosol-paths.js').AerosolParticlePath[]} particles the track's particles; one is the lead
 * @param {import('./aerosol-frame.js').ParticleAods[]} aods the AOD of each particle type at the lead's head, at each
 *   step
 * @returns {HeroSeries}
 */
export function heroSeries(particles, aods) {
  const hero = particles.find((p) => p.hero);
  if (!hero) throw new Error('aerosol: no lead particle');
  const heads = aods.map((_, step) => headOf(hero, step));
  const km = (a, b) => distanceKm(heads[a][0], heads[a][1], heads[b][0], heads[b][1]);
  const samples = heads.map(([lat, lon], step) => ({
    lat,
    east: lon - heads[0][1],
    speedKm: heads.length > 1 ? (step === 0 ? km(0, 1) : km(step - 1, step)) : 0,
    aods: aods[step],
  }));
  const lats = samples.map((s) => s.lat);
  return {
    particle: hero.particle,
    samples,
    lat: { min: Math.min(...lats), max: Math.max(...lats) },
    fastestKm: Math.max(...samples.map((s) => s.speedKm)),
  };
}

/** The series between its steps: `step` 0 to its last, a fraction along. */
export function heroAt({ samples }, step) {
  const at = Math.min(Math.max(step, 0), samples.length - 1);
  const i = Math.min(Math.floor(at), samples.length - 2);
  const from = samples[i];
  const to = samples[i + 1];
  const f = at - i;
  const mix = (a, b) => a + (b - a) * f;
  return {
    lat: mix(from.lat, to.lat),
    east: mix(from.east, to.east),
    speedKm: mix(from.speedKm, to.speedKm),
    aods: Object.fromEntries(Object.keys(from.aods).map((key) => [key, mix(from.aods[key], to.aods[key])])),
  };
}
