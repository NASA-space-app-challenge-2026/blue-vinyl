import { IceVoice } from '../../music/domain/ice-sea-score.js';
import { Kit } from '../../music/domain/composers/hurricane.js';
import { YEAR_TIMELINE, trackDurationSec } from '../../tracks/domain/year-timeline.js';
import { AlbumCategory } from '../domain/album.js';
import { Instrument } from '../../music/domain/instruments.js';
import { DAY_MS, YEAR_MS } from '../../tracks/domain/bird-track.js';

const ARCTIC_BIRD_TRACKS = 'data/arctic_bird/tracks';
const ARCTIC_BIRD_COVERS = 'assets/albums/arctic-bird';
// A week of the year a second: a bird's year in about 52 s.
const WEEK_A_SECOND_MS = 7 * DAY_MS;
const BIRD_YEAR_SEC = YEAR_MS / WEEK_A_SECOND_MS;

const GLACIER_DATA = 'data/glacier/tracks';
const GLACIER_COVERS = 'assets/albums/glacier';
// 32 years (1993–2024), one a bar (1.2 s) with no intro, then the last note's tail: 39.7 s.
const POLAR_YEARS = 32;
const POLAR_TRACK_SEC = trackDurationSec(YEAR_TIMELINE, POLAR_YEARS);

const HOT_OCEANS_DATA = 'data/hot_oceans/tracks';
const HOT_OCEANS_COVERS = 'assets/albums/hot-oceans';
// The Atlantic's neutral SST (°C), where storms on average neither strengthen nor weaken over the next 24 hours
// (notebooks/hot_oceans_album.ipynb, section 5.1): the sea above it lets a storm grow.
const ATLANTIC_NEUTRAL_SST_C = 26.9;
// Every storm's whole life plays in this long, whatever it lasted (5.25 to 15.5 days).
const STORM_TRACK_SEC = 30;

/** @type {import('../domain/album.js').Album[]} */
export const albums = [
  {
    id: 'arctic-bird',
    category: AlbumCategory.BIODIVERSITY,
    title: 'A Year on the Wing',
    coverUrl: 'assets/albums/arctic-bird/cover.jpg',
    coverCredit: 'Data: Arctic Animal Movement Archive, Movebank · NASA SVS 4877',
    msPerSec: WEEK_A_SECOND_MS,
    // The Buff-breasted sandpiper, from Alaska's Arctic coast to the Pampas, two of the four species of the archive's
    // public bird studies that fly the farthest in a year, and the Northern pintail, from northern Japan to eastern
    // Siberia (see notebooks/arctic_bird_album.ipynb, section 9).
    tracks: [
      // Covers: the lead photos of the species' English Wikipedia articles, from Wikimedia Commons (the Hudsonian
      // whimbrel, the whimbrel of the Americas that the Alaska study tags).
      {
        title: 'Buff-breasted Sandpiper', durationSec: BIRD_YEAR_SEC, birdsUrl: `${ARCTIC_BIRD_TRACKS}/buff_breasted_sandpiper.csv`, lead: Instrument.FLUTE, color: '#f0a040',
        coverUrl: `${ARCTIC_BIRD_COVERS}/buff_breasted_sandpiper.jpg`, coverCredit: 'Photo: Tim Lenz, CC BY 2.0, via Wikimedia Commons',
      },
      {
        title: 'Whimbrel', durationSec: BIRD_YEAR_SEC, birdsUrl: `${ARCTIC_BIRD_TRACKS}/whimbrel.csv`, lead: Instrument.OBOE, color: '#e8785a',
        coverUrl: `${ARCTIC_BIRD_COVERS}/whimbrel.jpg`, coverCredit: 'Photo: Charles J. Sharp, CC BY-SA 4.0, via Wikimedia Commons',
      },
      {
        title: 'Yellow-billed Loon', durationSec: BIRD_YEAR_SEC, birdsUrl: `${ARCTIC_BIRD_TRACKS}/yellow_billed_loon.csv`, lead: Instrument.FRENCH_HORN, color: '#68b4dc',
        coverUrl: `${ARCTIC_BIRD_COVERS}/yellow_billed_loon.jpg`, coverCredit: 'Photo: Ryan Askren, USGS Alaska Science Center, public domain, via Wikimedia Commons',
      },
      {
        title: 'Northern Pintail', durationSec: BIRD_YEAR_SEC, birdsUrl: `${ARCTIC_BIRD_TRACKS}/northern_pintail.csv`, lead: Instrument.OCARINA, color: '#a8aeb8',
        coverUrl: `${ARCTIC_BIRD_COVERS}/northern_pintail.jpg`, coverCredit: 'Photo: J.M.Garg, CC BY-SA 3.0, via Wikimedia Commons',
      },
    ],
  },
  {
    id: 'glacier',
    category: AlbumCategory.CLIMATE,
    title: 'As the Ice Melts',
    coverUrl: `${GLACIER_COVERS}/arctic.jpg`,
    coverCredit: 'NASA Scientific Visualization Studio',
    dataCredit: 'Data: NSIDC Sea Ice Index v4 · NOAA Laboratory for Satellite Altimetry',
    tracks: [
      {
        title: 'Arctic',
        durationSec: POLAR_TRACK_SEC,
        // Each track shows its own pole at its smallest ice of 2024, from the SVS page the track's ice comes from.
        coverUrl: `${GLACIER_COVERS}/arctic.jpg`,
        coverCredit: 'Cover: SVS 5382, Arctic sea ice, Sep 11 2024',
        iceSea: {
          csvUrl: `${GLACIER_DATA}/arctic_sea_ice_and_global_sea_level.csv`,
          shapesUrl: `${GLACIER_DATA}/arctic_september_sea_ice_extent.geojson`,
          poleLat: 90,
          // The ice on a vibraphone.
          iceVoice: IceVoice.VIBRAPHONE,
        },
      },
      {
        title: 'Antarctic',
        durationSec: POLAR_TRACK_SEC,
        coverUrl: `${GLACIER_COVERS}/antarctic.jpg`,
        coverCredit: 'Cover: SVS 5064, Antarctic sea ice, Feb 20 2024',
        iceSea: {
          csvUrl: `${GLACIER_DATA}/antarctic_sea_ice_and_global_sea_level.csv`,
          shapesUrl: `${GLACIER_DATA}/antarctic_february_sea_ice_extent.geojson`,
          poleLat: -90,
          // The ice on a piano, so the two tracks are told apart.
          iceVoice: IceVoice.PIANO,
        },
      },
    ],
  },
  {
    id: 'hot-oceans',
    category: AlbumCategory.CLIMATE,
    title: 'Hurricanes over Warm Water',
    coverUrl: `${HOT_OCEANS_COVERS}/lee_2017.jpg`,
    coverCredit: 'NASA, public domain, via Wikimedia Commons',
    dataCredit: 'Data: NASA SVS 5097, 5072 · HURDAT2 (NOAA/NHC) · GHRSST MUR SST v4.1 (NASA JPL, via NOAA CoastWatch)',
    // Three Atlantic hurricanes that grow over warm water and weaken over cool water, never near land, with the
    // sharpest turn from one to the other (see docs/albums/hot-oceans.md). Each plays its wind on its own percussion
    // family. Each track takes STORM_TRACK_SEC, so the storms' lives play at their own pace. Covers: each storm near
    // its peak, from NASA.
    tracks: [
      {
        title: 'Kirk 2012',
        durationSec: STORM_TRACK_SEC,
        coverUrl: `${HOT_OCEANS_COVERS}/kirk_2012.jpg`,
        coverCredit: 'Cover: MODIS, Aug 30 2012 (NASA MODIS/LANCE)',
        storm: {
          csvUrl: `${HOT_OCEANS_DATA}/kirk_2012.csv`,
          fieldUrl: `${HOT_OCEANS_DATA}/kirk_2012_sst.geojson`,
          kit: Kit.LATIN,
          neutralSstC: ATLANTIC_NEUTRAL_SST_C,
        },
      },
      {
        title: 'Lee 2017',
        durationSec: STORM_TRACK_SEC,
        coverUrl: `${HOT_OCEANS_COVERS}/lee_2017.jpg`,
        coverCredit: 'Cover: MODIS on Terra, Sep 27 2017 (NASA)',
        storm: {
          csvUrl: `${HOT_OCEANS_DATA}/lee_2017.csv`,
          fieldUrl: `${HOT_OCEANS_DATA}/lee_2017_sst.geojson`,
          kit: Kit.DRUMLINE,
          neutralSstC: ATLANTIC_NEUTRAL_SST_C,
        },
      },
      {
        title: 'Sam 2021',
        durationSec: STORM_TRACK_SEC,
        coverUrl: `${HOT_OCEANS_COVERS}/sam_2021.jpg`,
        coverCredit: 'Cover: NASA Worldview, Sep 26 2021',
        storm: {
          csvUrl: `${HOT_OCEANS_DATA}/sam_2021.csv`,
          fieldUrl: `${HOT_OCEANS_DATA}/sam_2021_sst.geojson`,
          kit: Kit.ORCHESTRA,
          neutralSstC: ATLANTIC_NEUTRAL_SST_C,
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
