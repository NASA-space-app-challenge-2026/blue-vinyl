import { IceVoice } from '../../music/domain/ice-sea-score.js';
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

const AEROSOL_DATA = 'data/aerosol/tracks';
const AEROSOL_COVERS = 'assets/albums/aerosol';
const AEROSOL_FRAMES = 'data/aerosol/tracks/frames';
// Two weeks, every 3 hours (112 steps), 0.4 s a step: a day is a bar of 3.2 s.
const AEROSOL_TRACK_SEC = 44.8;
// Where each event starts and the distant place it reaches, as in section 9.4 of notebooks/aerosol_album.ipynb.
const SAHARA = { lat: 18.0, lon: 2.0 };
const CARIBBEAN = { lat: 17.5, lon: -67.5 };
const SOUTHERN_AFRICA = { lat: -12.0, lon: 22.0 };
const ST_HELENA = { lat: -15.9, lon: -5.7 };
const SPAIN = { lat: 42.0, lon: -6.0 };
const BRITAIN = { lat: 52.5, lon: -1.5 };
const ETNA = { lat: 37.75, lon: 15.0 };
const GREECE = { lat: 38.5, lon: 22.5 };

/** @type {import('../domain/album.js').Album[]} */
export const albums = [
  {
    id: 'aerosol',
    category: AlbumCategory.CLIMATE,
    title: 'Connected by the Air',
    coverUrl: `${AEROSOL_COVERS}/cover.jpg`,
    coverCredit: 'NASA Scientific Visualization Studio · SVS 5669',
    dataCredit: 'Data: NASA GMAO GEOS-FP · NOAA NHC',
    tracks: [
      {
        title: 'Hurricane Erin',
        durationSec: AEROSOL_TRACK_SEC,
        color: '#4080ff',
        coverUrl: `${AEROSOL_COVERS}/erin.jpg`,
        coverCredit: 'NASA MODIS Rapid Response, Aug 16 2025',
        aerosol: {
          csvUrl: `${AEROSOL_DATA}/erin.csv`,
          framesDir: AEROSOL_FRAMES,
          lead: 'sea_salt',
          trackEye: true,
          // The receptor is the eye itself, the view centre.
          events: [{ id: 'sahara', particle: 'dust', source: SAHARA, receptor: null }],
        },
      },
      {
        title: 'Saharan Dust',
        durationSec: AEROSOL_TRACK_SEC,
        color: '#ff58a0',
        coverUrl: `${AEROSOL_COVERS}/saharan_dust.jpg`,
        coverCredit: 'NASA MODIS / Terra, Saharan Dust over the Atlantic',
        aerosol: {
          csvUrl: `${AEROSOL_DATA}/saharan_dust.csv`,
          framesDir: AEROSOL_FRAMES,
          lead: 'dust',
          events: [{ id: 'sahara', particle: 'dust', source: SAHARA, receptor: CARIBBEAN }],
          viewLat: 17.0,
          viewLon: -45.0,
        },
      },
      {
        title: 'Southern Africa Smoke',
        durationSec: AEROSOL_TRACK_SEC,
        color: '#ff7820',
        coverUrl: `${AEROSOL_COVERS}/southern_africa_smoke.jpg`,
        coverCredit: 'NASA Earth Observatory / Aqua MODIS, Fires and Smoke',
        aerosol: {
          csvUrl: `${AEROSOL_DATA}/southern_africa_smoke.csv`,
          framesDir: AEROSOL_FRAMES,
          lead: 'smoke',
          events: [{ id: 'southern-africa', particle: 'smoke', source: SOUTHERN_AFRICA, receptor: ST_HELENA }],
          viewLat: -12.0,
          viewLon: 5.0,
        },
      },
      {
        title: 'Spain and Etna',
        durationSec: AEROSOL_TRACK_SEC,
        color: '#e0a030',
        coverUrl: `${AEROSOL_COVERS}/spain_and_etna.jpg`,
        coverCredit: 'NASA MODIS / Terra, Mt. Etna Eruption',
        aerosol: {
          csvUrl: `${AEROSOL_DATA}/spain_and_etna.csv`,
          framesDir: AEROSOL_FRAMES,
          lead: 'smoke_and_sulfate',
          events: [
            { id: 'spain', particle: 'smoke', source: SPAIN, receptor: BRITAIN },
            { id: 'etna', particle: 'sulfate', source: ETNA, receptor: GREECE },
          ],
          viewLat: 40.0,
          viewLon: 5.0,
        },
      },
    ],
  },

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
