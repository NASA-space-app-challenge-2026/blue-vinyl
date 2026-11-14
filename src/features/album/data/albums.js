import { AlbumCategory } from '../domain/album.js';
import { DAY_SEC } from '../../music/domain/composers/migration.js';
import { Instrument } from '../../music/domain/instruments.js';
import { FOLDED_YEAR_DAYS } from '../../tracks/domain/flock-year.js';

const ARCTIC_BIRD_TRACKS = 'data/arctic_bird/tracks';
// One day of the folded year per step of the music.
const FLOCK_YEAR_SEC = FOLDED_YEAR_DAYS * DAY_SEC;

/** @type {import('../domain/album.js').Album[]} */
export const albums = [
  {
    id: 'arctic-bird',
    category: AlbumCategory.BIODIVERSITY,
    title: 'A Year on the Wing',
    coverUrl: 'assets/albums/arctic-bird/cover.jpg',
    coverCredit: 'Data: Arctic Animal Movement Archive, Movebank · NASA SVS 4877',
    // The four species of the archive's public bird studies that fly the farthest in a year, farthest first.
    tracks: [
      { title: 'Lesser Yellowlegs', durationSec: FLOCK_YEAR_SEC, flockUrl: `${ARCTIC_BIRD_TRACKS}/lesser_yellowlegs.csv`, lead: Instrument.FLUTE, color: '#f0a040' },
      { title: 'Whimbrel', durationSec: FLOCK_YEAR_SEC, flockUrl: `${ARCTIC_BIRD_TRACKS}/whimbrel.csv`, lead: Instrument.OBOE, color: '#e8785a' },
      { title: 'Yellow-billed Loon', durationSec: FLOCK_YEAR_SEC, flockUrl: `${ARCTIC_BIRD_TRACKS}/yellow_billed_loon.csv`, lead: Instrument.FRENCH_HORN, color: '#68b4dc' },
      { title: 'Red-throated Loon', durationSec: FLOCK_YEAR_SEC, flockUrl: `${ARCTIC_BIRD_TRACKS}/red_throated_loon.csv`, lead: Instrument.CLARINET, color: '#9ccc64' },
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
