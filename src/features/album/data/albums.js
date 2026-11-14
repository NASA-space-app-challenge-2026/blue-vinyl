import { IceVoice } from '../../music/domain/ice-sea-score.js';
import { Kit } from '../../music/domain/composers/hurricane.js';
import { YEAR_TIMELINE, trackDurationSec } from '../../tracks/domain/year-timeline.js';
import { AlbumCategory } from '../domain/album.js';
import { Instrument } from '../../music/domain/instruments.js';
import { DAY_MS, YEAR_MS } from '../../tracks/domain/bird-track.js';
import { Hemisphere } from '../../tracks/domain/storm-season.js';

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

const HEMISPHERES_DATA = 'data/hemispheres/tracks';
const HEMISPHERES_COVERS = 'assets/albums/hemispheres';
// Degrees of arc from an ocean's centre to the label's edge. The southern oceans' storms spread over a hundred degrees
// of longitude, so their globe is drawn smaller.
const NORTHERN_ARC_DEG = 42;
const SOUTHERN_ARC_DEG = 56;
const STORMS_CREDIT = 'Data: IBTrACS v04r01 (NOAA/NCEI), NHC and JTWC best tracks · NASA SVS 5097';

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
    title: "The Hurricane's Heartbeat",
    coverUrl: `${HOT_OCEANS_COVERS}/katrina_2005.jpg`,
    coverCredit: 'NASA/GSFC MODIS Rapid Response, public domain, via Wikimedia Commons',
    dataCredit: 'Data: NASA SVS 5072 · HURDAT2 (NOAA/NHC)',
    // Four Atlantic hurricanes that come ashore and die on land (see docs/albums/hot-oceans.md). Each plays its wind as
    // the tempo of one beat on its own percussion family, from its birth until its wind falls below 50 km/h. Each
    // track's length (notebooks/hot_oceans_album.ipynb, section 12) plays the storm's life in 30 s and its dying on land
    // on at the same pace. Covers: each storm near its peak, from NASA.
    tracks: [
      {
        title: 'Katrina 2005',
        durationSec: 33.3,
        coverUrl: `${HOT_OCEANS_COVERS}/katrina_2005.jpg`,
        coverCredit: 'Cover: MODIS, Aug 28 2005 (NASA/GSFC)',
        storm: { csvUrl: `${HOT_OCEANS_DATA}/katrina_2005.csv`, kit: Kit.DRUM_SET },
      },
      {
        title: 'Felix 2007',
        durationSec: 30,
        coverUrl: `${HOT_OCEANS_COVERS}/felix_2007.jpg`,
        coverCredit: 'Cover: International Space Station, Sep 3 2007 (NASA)',
        storm: { csvUrl: `${HOT_OCEANS_DATA}/felix_2007.csv`, kit: Kit.DRUMLINE },
      },
      {
        title: 'Laura 2020',
        durationSec: 30,
        coverUrl: `${HOT_OCEANS_COVERS}/laura_2020.jpg`,
        coverCredit: 'Cover: VIIRS, Aug 26 2020 (NASA LANCE)',
        storm: { csvUrl: `${HOT_OCEANS_DATA}/laura_2020.csv`, kit: Kit.LATIN },
      },
      {
        title: 'Helene 2024',
        durationSec: 36.9,
        coverUrl: `${HOT_OCEANS_COVERS}/helene_2024.jpg`,
        coverCredit: 'Cover: MODIS on Aqua, Sep 26 2024 (NASA Worldview)',
        storm: { csvUrl: `${HOT_OCEANS_DATA}/helene_2024.csv`, kit: Kit.ORCHESTRA },
      },
    ],
  },
  {
    id: 'hemispheres',
    category: AlbumCategory.CLIMATE,
    title: 'The Year the Oceans Ran Hot',
    coverUrl: `${HEMISPHERES_COVERS}/hurricane_lee_2023.jpg`,
    coverCredit: 'Public domain, via Wikimedia Commons',
    dataCredit: STORMS_CREDIT,
    // Four storm seasons, every storm of each: two northern oceans and two southern ones, three around 2023, the year
    // the oceans ran hottest on record, and the South Pacific's busiest (see docs/albums/hemispheres.md). Each cover is
    // one of the season's strongest storms.
    tracks: [
      {
        title: 'Atlantic 2023',
        durationSec: 40,
        color: '#7fc4e8',
        coverUrl: `${HEMISPHERES_COVERS}/hurricane_lee_2023.jpg`,
        coverCredit: 'Cover: Hurricane Lee, Sep 2023, MODIS (NASA GSFC)',
        season: {
          url: `${HEMISPHERES_DATA}/atlantic_2023.csv`,
          from: '2023-06-01',
          to: '2023-11-30',
          hemisphere: Hemisphere.NORTH,
          lead: Instrument.WHISTLE,
          focus: { lat: 24, lon: -59, arcDeg: NORTHERN_ARC_DEG },
        },
      },
      {
        title: 'Western Pacific 2023',
        durationSec: 45,
        color: '#e8b07f',
        coverUrl: `${HEMISPHERES_COVERS}/typhoon_mawar_2023.jpg`,
        coverCredit: 'Cover: Typhoon Mawar, May 26 2023, Suomi NPP VIIRS (NOAA/NASA)',
        dataCredit: `${STORMS_CREDIT}, 5122 Typhoon Mawar`,
        season: {
          url: `${HEMISPHERES_DATA}/west_pacific_2023.csv`,
          from: '2023-05-01',
          to: '2023-11-30',
          hemisphere: Hemisphere.NORTH,
          lead: Instrument.VOICE_OOHS,
          focus: { lat: 20, lon: 135, arcDeg: NORTHERN_ARC_DEG },
        },
      },
      {
        // The southern summer of 2022-23, December to April, when Freddy crossed the whole ocean in the longest life of
        // any tropical cyclone on record.
        title: 'South Indian 2022–23',
        durationSec: 32,
        color: '#b29ae6',
        coverUrl: `${HEMISPHERES_COVERS}/cyclone_freddy_2023.jpg`,
        coverCredit: 'Cover: Cyclone Freddy, Feb 19 2023, Suomi NPP VIIRS (NASA)',
        dataCredit: `${STORMS_CREDIT}, 14312 Freddy`,
        season: {
          url: `${HEMISPHERES_DATA}/south_indian_2022_23.csv`,
          from: '2022-12-01',
          to: '2023-04-30',
          hemisphere: Hemisphere.SOUTH,
          lead: Instrument.CELLO,
          focus: { lat: -18, lon: 80, arcDeg: SOUTHERN_ARC_DEG },
        },
      },
      {
        // The South Pacific's busiest season on record, in the strongest El Niño then measured: Ron and Susan were both
        // category 5 in January 1998.
        title: 'South Pacific 1997–98',
        durationSec: 37,
        color: '#e48fb6',
        coverUrl: `${HEMISPHERES_COVERS}/cyclone_ron_1998.jpg`,
        coverCredit: 'Cover: Cyclone Ron, Jan 6 1998, GOES-9 (NOAA)',
        dataCredit: `${STORMS_CREDIT}, 185 Cyclone Susan`,
        season: {
          url: `${HEMISPHERES_DATA}/south_pacific_1997_98.csv`,
          from: '1997-07-01',
          to: '1998-06-30',
          hemisphere: Hemisphere.SOUTH,
          lead: Instrument.TROMBONE,
          focus: { lat: -20, lon: 178, arcDeg: SOUTHERN_ARC_DEG },
        },
      },
    ],
  },
];
