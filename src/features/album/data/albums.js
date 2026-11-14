import { Harmony, Instrument, SeaStyle } from '../../music/domain/ice-sea-score.js';
import { YEAR_TIMELINE, trackDurationSec } from '../../tracks/domain/year-timeline.js';
import { AlbumCategory } from '../domain/album.js';

const GLACIER_DATA = 'data/glacier/tracks';
// 32 years (1993–2024), one a bar at the score's tempo (1.82 s) with no intro, then the last chord's tail: 59.5 s.
const POLAR_YEARS = 32;
const POLAR_TRACK_SEC = trackDurationSec(YEAR_TIMELINE, POLAR_YEARS);

/** @type {import('../domain/album.js').Album[]} */
export const albums = [
  {
    id: 'glacier',
    category: AlbumCategory.CLIMATE,
    title: 'As the Ice Melts',
    coverUrl: 'assets/albums/glacier/cover.jpg',
    coverCredit: 'Cover: NASA Scientific Visualization Studio (SVS 5382)',
    dataCredit: 'Data: NSIDC Sea Ice Index v4 · NOAA Laboratory for Satellite Altimetry',
    tracks: [
      {
        title: 'North',
        durationSec: POLAR_TRACK_SEC,
        iceSea: {
          csvUrl: `${GLACIER_DATA}/arctic_sea_ice_and_global_sea_level.csv`,
          shapesUrl: `${GLACIER_DATA}/arctic_september_sea_ice_extent.geojson`,
          poleLat: 90,
          // Piano, after the opening of Rachmaninoff's Second Concerto. On the downbeat both hands play the ice as a
          // chord over F, held the whole bar: the right hand's top note is the ice, the normal is F5 (the top of the
          // score's first chord), and each 0.4 million km² is one step of C minor. Half a bar later the left hand strikes
          // the score's low F1, in each year the sea rose, harder the higher the sea.
          voice: {
            instrument: Instrument.PIANO,
            homeMidi: 77,
            kmPerStep: 0.4,
            lengthBeats: 1,
            chord: true,
            harmony: Harmony.OPENING,
            level: 0.407,
            sea: { instrument: Instrument.PIANO, style: SeaStyle.BELLS, offsetBeats: 0.5, held: false, transpose: 0, level: 0.32 },
          },
        },
      },
      {
        title: 'South',
        durationSec: POLAR_TRACK_SEC,
        iceSea: {
          csvUrl: `${GLACIER_DATA}/antarctic_sea_ice_and_global_sea_level.csv`,
          shapesUrl: `${GLACIER_DATA}/antarctic_february_sea_ice_extent.geojson`,
          poleLat: -90,
          // Cello; the normal is C4 and each 0.15 million km² is one step of C minor. The sea is a held horn line.
          voice: {
            instrument: Instrument.CELLO,
            homeMidi: 60,
            kmPerStep: 0.15,
            lengthBeats: 1.12,
            sea: { instrument: Instrument.HORN, offsetBeats: 0, held: true, transpose: 12, level: 1 },
          },
        },
      },
    ],
  },
  {
    id: 'curlew',
    category: AlbumCategory.BIODIVERSITY,
    title: 'Along the Flyway',
    coverUrl: 'assets/albums/curlew/cover.jpg',
    coverCredit: 'Photo: TBD',
    tracks: [
      { title: 'Far Eastern Curlew', durationSec: 52 },
      { title: 'Bar-tailed Godwit', durationSec: 52 },
      { title: 'Red Knot', durationSec: 47 },
      { title: 'Great Knot', durationSec: 52 },
    ],
  },
  // Placeholder albums for album switching; replace with real data.
  {
    id: 'dummy-coral',
    category: AlbumCategory.BIODIVERSITY,
    title: 'Dummy Album Two',
    coverUrl: 'assets/albums/dummy-coral/cover.jpg',
    coverCredit: 'Photo: TBD',
    tracks: [
      { title: 'Dummy Track A', durationSec: 40 },
      { title: 'Dummy Track B', durationSec: 75 },
      { title: 'Dummy Track C', durationSec: 30 },
    ],
  },
  {
    id: 'dummy-forest',
    category: AlbumCategory.BIODIVERSITY,
    title: 'Dummy Album Three',
    coverUrl: 'assets/albums/dummy-forest/cover.jpg',
    coverCredit: 'Photo: TBD',
    tracks: [
      { title: 'Dummy Track A', durationSec: 60 },
      { title: 'Dummy Track B', durationSec: 60 },
    ],
  },
  {
    id: 'dummy-tundra',
    category: AlbumCategory.BIODIVERSITY,
    title: 'Dummy Album Four',
    coverUrl: 'assets/albums/dummy-tundra/cover.jpg',
    coverCredit: 'Photo: TBD',
    tracks: [
      { title: 'Dummy Track A', durationSec: 25 },
      { title: 'Dummy Track B', durationSec: 35 },
      { title: 'Dummy Track C', durationSec: 45 },
      { title: 'Dummy Track D', durationSec: 30 },
      { title: 'Dummy Track E', durationSec: 50 },
    ],
  },
];
