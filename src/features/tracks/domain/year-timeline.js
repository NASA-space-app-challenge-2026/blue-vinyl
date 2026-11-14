/**
 * How a yearly series plays in time: an intro, then one beat (a bar of the score) per year, then a tail for the last
 * note to ring out. The tempo comes first: a longer series makes a longer track. Sound and globe both read it, so a year's note and its picture change at the same moment.
 *
 * @typedef {Object} YearTimeline
 * @property {number} introSec time before the first year
 * @property {number} beatSec length of one year (one bar of the score)
 * @property {number} tailSec time after the last bar, for the last note to ring out
 */

// The opening of Rachmaninoff's Piano Concerto No. 2: Moderato, half note = 66, in cut time, so a bar is two half notes.
const HALF_NOTE_SEC = 60 / 66;

/**
 * One year a bar at the score's tempo (1.82 s), with no intro: the concerto opens on the piano's first chord.
 *
 * @type {YearTimeline}
 */
export const YEAR_TIMELINE = Object.freeze({ introSec: 0, beatSec: 2 * HALF_NOTE_SEC, tailSec: 1.3 });

/** Length of a track of `count` years: the intro, one bar a year, and the tail. */
export function trackDurationSec(timeline, count) {
  return timeline.introSec + count * timeline.beatSec + timeline.tailSec;
}

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
