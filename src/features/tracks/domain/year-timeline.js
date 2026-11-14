/**
 * How a yearly series plays in time: an intro, then one beat per year. Sound and globe both read it, so a year's
 * note and its picture change at the same moment.
 *
 * @typedef {Object} YearTimeline
 * @property {number} introSec time before the first year
 * @property {number} beatSec length of one year
 */

/** @type {YearTimeline} */
export const YEAR_TIMELINE = Object.freeze({ introSec: 4, beatSec: 1.5 });

/**
 * The year playing at `sec` into the track: its index (-1 during the intro, the last year after the last beat) and
 * how far into its beat the track is.
 *
 * @param {YearTimeline} timeline
 * @param {number} sec
 * @param {number} count number of years
 * @returns {{ index: number, beatSec: number }}
 */
export function yearAt(timeline, sec, count) {
  const beats = (sec - timeline.introSec) / timeline.beatSec;
  if (beats < 0) return { index: -1, beatSec: sec };
  const index = Math.min(Math.floor(beats), count - 1);
  return { index, beatSec: sec - timeline.introSec - index * timeline.beatSec };
}

/** Start of year `index` in seconds from the track start. */
export function yearStartSec(timeline, index) {
  return timeline.introSec + index * timeline.beatSec;
}
