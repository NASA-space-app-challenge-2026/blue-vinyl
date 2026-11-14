export const AlbumCategory = Object.freeze({
  BIODIVERSITY: 'biodiversity',
  CLIMATE: 'climate',
  EXTREME_WEATHER: 'extreme-weather',
});

/**
 * A track that plays one pole's sea ice with the global sea level, from the files the album notebook exports
 * (see docs/data-guide.md).
 *
 * @typedef {Object} IceSeaSource
 * @property {string} csvUrl the track's yearly data
 * @property {string} shapesUrl GeoJSON of each year's ice and the normal ice edge
 * @property {number} poleLat latitude the globe looks down on: 90 or -90
 * @property {import('../../music/domain/ice-sea-score.js').IceVoice} iceVoice the instrument the ice is played on
 */

/**
 * A track that plays one hurricane's whole life, from the file the album notebook exports (see docs/data-guide.md).
 *
 * @typedef {Object} StormSource
 * @property {string} csvUrl the storm's records
 * @property {Object} kit the percussion family its wind is played on (Kit in music/domain/composers/hurricane.js)
 */

/**
 * A track that plays a year of lightning over one side of the Earth, from the files the album notebook exports (see
 * docs/data-guide.md).
 *
 * @typedef {Object} LightningSource
 * @property {string} tracksDir the album's tracks folder, holding the track's CSV and tracks.json
 * @property {string} file the track's CSV
 * @property {Object} north the Instrument the northern hemisphere's flashes are struck on (see composers/lightning.js)
 * @property {Object} south the Instrument the southern hemisphere's flashes are struck on
 */

/**
 * @typedef {Object} Track
 * @property {string} title
 * @property {number} durationSec
 * @property {IceSeaSource} [iceSea] data, sound and view of a polar track
 * @property {StormSource} [storm] data, sound and view of a hurricane track
 * @property {LightningSource} [lightning] data and sound of a lightning track
 * @property {string} [birdsUrl] the birds' paths the track plays (see tracks/domain/bird-track.js)
 * @property {Object} [lead] the Instrument that carries the track's information (see music/domain/instruments.js)
 * @property {string} [color] CSS color the track's data is drawn in
 * @property {string} [coverUrl] the track's own cover image, shown on the sleeve while it is the current track
 * @property {string} [coverCredit] credit and license of the track's cover image
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
 * @property {string} [dataCredit] sources of the album's data, shown with the cover credit
 * @property {Track[]} tracks
 * @property {number} [msPerSec] ms of data time a second of a track plays, for an album whose tracks play data
 * @property {Object} [globeLens] the GlobeLens the globe is seen through (see globe/domain/globe-lens.js), when not
 *   the default
 */

/**
 * Wraps a catalog index round the ends, so stepping past the last album reaches the first.
 *
 * @param {number} index
 * @param {number} count
 */
export function wrapIndex(index, count) {
  return ((index % count) + count) % count;
}

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

/**
 * Seconds from the album start to the start of the track at `index`.
 *
 * @param {Album} album
 * @param {number} index
 */
export function trackStartSec(album, index) {
  return album.tracks.slice(0, index).reduce((sum, track) => sum + track.durationSec, 0);
}

/**
 * The cover the sleeve shows while the track at `trackIndex` is current: the track's own, or else the album's.
 *
 * @param {Album} album
 * @param {number} trackIndex
 * @returns {{ url: string, credit: string }}
 */
export function trackCover(album, trackIndex) {
  const track = album.tracks[trackIndex];
  if (!track?.coverUrl) return { url: album.coverUrl, credit: album.coverCredit };
  return { url: track.coverUrl, credit: [track.coverCredit, album.coverCredit].filter(Boolean).join(' · ') };
}
