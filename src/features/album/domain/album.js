export const AlbumCategory = Object.freeze({
  BIODIVERSITY: 'biodiversity',
  CLIMATE: 'climate',
  EXTREME_WEATHER: 'extreme-weather',
  AIR_QUALITY: 'air-quality',
  DISASTER: 'disaster',
});

/** How each AlbumCategory is named on the sleeve and in the About dialog. */
export const ALBUM_CATEGORY_LABEL = Object.freeze({
  [AlbumCategory.BIODIVERSITY]: 'Biodiversity',
  [AlbumCategory.CLIMATE]: 'Climate',
  [AlbumCategory.EXTREME_WEATHER]: 'Extreme Weather',
  [AlbumCategory.DISASTER]: 'Disaster',
  [AlbumCategory.AIR_QUALITY]: 'Air Quality',
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
 * A track that plays atmospheric aerosol optical depth and particle motion from GEOS-FP.
 *
 * @typedef {Object} AerosolSource
 * @property {string} csvUrl the track's time series CSV
 * @property {string} framesDir directory containing the visual PNG frames
 * @property {string} lead particle type that leads the track ('sea_salt', 'dust', 'smoke', 'sulfate')
 * @property {number} [viewLat] latitude of the track's view centre
 * @property {number} [viewLon] longitude of the track's view centre
 * @property {boolean} [trackEye] whether the view follows the eye of the storm
 * @property {number} [arcDeg] degrees of arc from the view centre to the label's edge, closer than the whole globe
 * @property {number} [tonic] pitch class of the track's minor key (0 for C, the album's key, when left out)
 * @property {AerosolEvent[]} events what the track's music follows: an event leaving its source for a distant place
 */

/**
 * One event of an aerosol track: a plume of one particle type leaving its source and reaching a distant receptor.
 * Its numbers are the CSV's `<particle>_*` event columns.
 *
 * @typedef {Object} AerosolEvent
 * @property {string} id the event, which picks its motif; the same event keeps its motif across tracks
 * @property {import('../../tracks/domain/aerosol-track.js').Particle} particle
 * @property {{ lat: number, lon: number } | 'eye'} source where it starts; 'eye' is the view centre (Erin's eye)
 * @property {{ lat: number, lon: number } | 'eye' | null} receptor where it is heading; null for an event that only
 *   spreads from its source
 * @property {number} [level] how loud it is against the track's lead, 1 when left out
 * @property {'arrival'} [heard] 'arrival' plays only its arrival, not its source or journey
 * @property {boolean} [spin] its motif turns faster as the storm's wind rises (Erin)
 */

/**
 * A track that plays one hurricane's whole life, from the file the album notebook exports (see docs/data-guide.md).
 *
 * @typedef {Object} StormSource
 * @property {string} csvUrl the storm's records
 * @property {Object} kit the percussion family its wind is played on (Kit in music/domain/composers/hurricane.js)
 */

/**
 * A track that plays one ocean's storm season, from the file the album notebook exports (see docs/data-guide.md).
 *
 * @typedef {Object} StormSeasonSource
 * @property {string} url the season's storms
 * @property {{ startMs: number, endMs: number }} span the data time the track plays, its file's first record to its
 *   last (see seasonSpan in tracks/domain/storm-season.js)
 * @property {string} hemisphere one of Hemisphere (see tracks/domain/storm-season.js): where the storms sing
 * @property {Object} lead the Lead the storms sing on (see music/domain/patches.js)
 * @property {{ lat: number, lon: number, arcDeg: number }} focus the ocean's centre, held in the middle of the globe,
 *   and how many degrees of arc from it the label's edge is
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
 * A track that plays the smog around a city, from the files the album notebook exports (see docs/data-guide.md).
 *
 * @typedef {Object} SmogSource
 * @property {string} tracksDir the album's tracks folder, holding the track's CSVs and tracks.json
 * @property {string} file the track's CSV
 * @property {Object} loop the loop it plays (one of SmogLoop in music/domain/composers/smog.js)
 */

/**
 * @typedef {Object} Track
 * @property {AerosolSource} [aerosol] aerosol data and view
 * @property {string} title
 * @property {number} durationSec
 * @property {IceSeaSource} [iceSea] data, sound and view of a polar track
 * @property {StormSource} [storm] data, sound and view of a hurricane track
 * @property {StormSeasonSource} [season] data, sound and view of a storm season track
 * @property {LightningSource} [lightning] data and sound of a lightning track
 * @property {SmogSource} [smog] data, sound and view of a smog track
 * @property {{ kind: 'annual' | 'season', csvUrl: string, firesUrl: string }} [wildfire]
 * @property {string} [birdsUrl] the birds' paths the track plays (see tracks/domain/bird-track.js)
 * @property {{ lineUrl: string, mapUrl: string }} [forest] the noon line and canopy map
 *   the track plays (see tracks/domain/noon-line.js)
 * @property {Object} [lead] the Instrument that carries the track's information (see music/domain/instruments.js)
 * @property {string} [color] CSS color the track's data is drawn in
 * @property {string} [coverUrl] the track's own cover image, shown on the sleeve while it is the current track
 * @property {string} [coverCredit] credit and license of the track's cover image
 * @property {string} [dataCredit] sources of the track's data, shown instead of the album's while it is current
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

/** @param {number} sec a length of time @returns {string} as minutes:seconds, such as 3:05 */
export function formatDuration(sec) {
  const whole = Math.round(sec);
  const minutes = Math.floor(whole / 60);
  const seconds = String(whole % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
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

// Each track's sound fades in over its first seconds and out over its last, so one track eases into the next.
const TRACK_FADE = Object.freeze({ inSec: 1.5, outSec: 2.5 });

/**
 * How loud the music is (0..1) `sec` into the track at `index`: rising from silence at its start, falling to silence
 * at its end, on an eased curve; full in between. A fade never takes more than half of a short track.
 *
 * @param {Album} album
 * @param {number} index
 * @param {number} sec
 */
export function trackFadeAt(album, index, sec) {
  const { durationSec } = album.tracks[index];
  const inSec = Math.min(TRACK_FADE.inSec, durationSec / 2);
  const outSec = Math.min(TRACK_FADE.outSec, durationSec / 2);
  const along = Math.max(0, Math.min(1, sec / inSec, (durationSec - sec) / outSec));
  return along * along * (3 - 2 * along);
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
