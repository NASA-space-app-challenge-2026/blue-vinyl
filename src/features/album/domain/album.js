/**
 * @typedef {Object} Track
 * @property {string} title
 * @property {number} durationSec
 */

/**
 * One album is pressed on one LP record.
 *
 * @typedef {Object} Album
 * @property {string} id
 * @property {string} title
 * @property {string} coverUrl
 * @property {Track[]} tracks
 */

/** @param {Album} album */
export function albumDurationSec(album) {
  return album.tracks.reduce((sum, track) => sum + track.durationSec, 0);
}

/**
 * Playback progress (0..1) at every track edge: the start of each track, then the album end.
 *
 * @param {Album} album
 * @returns {number[]}
 */
export function trackBoundaries(album) {
  const total = albumDurationSec(album);
  const boundaries = [0];
  let elapsed = 0;
  for (const track of album.tracks) {
    elapsed += track.durationSec;
    boundaries.push(elapsed / total);
  }
  return boundaries;
}
