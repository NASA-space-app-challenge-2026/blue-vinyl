import { Instrument } from '../../music/domain/ice-sea-score.js';
import { AlbumCategory } from '../domain/album.js';

const GLACIER_DATA = 'data/glacier/tracks';
// Intro 4 s, 32 years of 1.5 s (1993–2024), then the last note held and its tail.
const POLAR_TRACK_SEC = 58;

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
          // Piano; the normal is D5 and each 0.25 million km² is one step of D minor.
          voice: { instrument: Instrument.PIANO, homeMidi: 74, kmPerStep: 0.25, lengthBeats: 0.95 },
        },
      },
      {
        title: 'South',
        durationSec: POLAR_TRACK_SEC,
        iceSea: {
          csvUrl: `${GLACIER_DATA}/antarctic_sea_ice_and_global_sea_level.csv`,
          shapesUrl: `${GLACIER_DATA}/antarctic_february_sea_ice_extent.geojson`,
          poleLat: -90,
          // Cello; the normal is D4 and each 0.15 million km² is one step of D minor.
          voice: { instrument: Instrument.CELLO, homeMidi: 62, kmPerStep: 0.15, lengthBeats: 1.12 },
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
