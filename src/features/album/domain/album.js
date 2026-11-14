export const AlbumCategory = Object.freeze({
  BIODIVERSITY: 'biodiversity',
});

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
 * @property {string} category one of AlbumCategory
 * @property {string} title
 * @property {string} coverUrl
 * @property {string} coverCredit
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

/**
 * Index of the track playing at the given progress (0..1).
 *
 * @param {Album} album
 * @param {number} progress
 */
export function trackIndexAt(album, progress) {
  const boundaries = trackBoundaries(album);
  const index = boundaries.findIndex((edge, i) => i > 0 && progress < edge);
  return index === -1 ? album.tracks.length - 1 : index - 1;
}
