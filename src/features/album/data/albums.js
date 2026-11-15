import { IceVoice } from '../../music/domain/ice-sea-score.js';
import { Kit } from '../../music/domain/composers/hurricane.js';
import { YEAR_TIMELINE, trackDurationSec } from '../../tracks/domain/year-timeline.js';
import { AlbumCategory } from '../domain/album.js';
import { GlobeLens } from '../../globe/domain/globe-lens.js';
import { Instrument } from '../../music/domain/instruments.js';
import { Lead } from '../../music/domain/patches.js';
import { NorthInstrument, SouthInstrument } from '../../music/domain/composers/lightning.js';
import { SmogLoop } from '../../music/domain/composers/smog.js';
import { DAY_MS, YEAR_MS } from '../../tracks/domain/bird-track.js';
import { SOUND_STEPS, STEP_SEC } from '../../tracks/domain/noon-line.js';
import { Hemisphere, seasonDurationSec, seasonSpan } from '../../tracks/domain/storm-season.js';

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

const EXTREME_WEATHER_TRACKS = 'data/extreme_weather/tracks';
const LIGHTNING_COVERS = 'assets/albums/lightning';
// A year of lightning (2021) in a minute, about six days a second.
const LIGHTNING_YEAR_SEC = 60;
const HOT_OCEANS_DATA = 'data/hot_oceans/tracks';
const HOT_OCEANS_COVERS = 'assets/albums/hot-oceans';

const HEMISPHERES_DATA = 'data/hemispheres/tracks';
const HEMISPHERES_COVERS = 'assets/albums/hemispheres';
// Degrees of arc from an ocean's centre to the label's edge: the globe drawn 1.5 times the label's size, where the edge
// is asin(1 / 1.5) from the centre. The southern oceans' storms spread over a hundred degrees of longitude, so their
// globe is drawn 1.2 times the label's size.
const NORTHERN_ARC_DEG = 41.8;
const SOUTHERN_ARC_DEG = 56.4;
// What each season track plays: its file's first record to its last.
const SEASON_SPANS = Object.freeze({
  atlantic: seasonSpan('2023-06-01T12:00Z', '2023-10-28T18:00Z'),
  southIndian: seasonSpan('2023-01-01T00:00Z', '2023-04-15T06:00Z'),
});
const STORMS_CREDIT = 'Data: IBTrACS v04r01 (NOAA/NCEI), NHC and JTWC best tracks · NASA SVS 5097';

const WILDFIRE_DATA = 'data/wildfire/tracks';
const WILDFIRE_COVERS = 'assets/albums/wildfire';
// 42 years (1983–2024), one a bar of 0.68 s, then the last note's tail: 29.9 s.
export const WILDFIRE_YEAR_TIMELINE = Object.freeze({ introSec: 0, beatSec: 0.68, tailSec: 1.3 });
const WILDFIRE_YEARS = 42;
const WILDFIRE_ANNUAL_SEC = trackDurationSec(WILDFIRE_YEAR_TIMELINE, WILDFIRE_YEARS);
// 214 days of the 2020 large-fire season (Jun 1 – Dec 31), a day a beat of 0.13 s, then a tail: 29.0 s. The year
// timeline's functions read it the same way, one beat a day instead of a year.
export const WILDFIRE_DAY_TIMELINE = Object.freeze({ introSec: 0, beatSec: 0.13, tailSec: 1.2 });
const WILDFIRE_DAYS = 214;
const WILDFIRE_SEASON_SEC = trackDurationSec(WILDFIRE_DAY_TIMELINE, WILDFIRE_DAYS);

const FOREST_TRACKS = 'data/forest/tracks';
const FOREST_COVERS = 'assets/albums/forest';
// The Earth turns under the noon line from the first step, with the listening legend riding along, until the last note.
const FOREST_LINE_SEC = SOUND_STEPS * STEP_SEC;

const AEROSOL_DATA = 'data/aerosol/tracks';
const AEROSOL_COVERS = 'assets/albums/aerosol';
const AEROSOL_FRAMES = 'data/aerosol/tracks/frames';
// Two weeks, every 3 hours (112 steps), 0.25 s a step.
const AEROSOL_STEPS = 112;
const AEROSOL_STEP_SEC = 0.25;
const AEROSOL_TRACK_SEC = AEROSOL_STEPS * AEROSOL_STEP_SEC;

const SMOG_TRACKS = 'data/smog/tracks';
const SMOG_COVERS = 'assets/albums/smog';

/**
 * A smog song: the hours around its city, played on `loop` (one of SmogLoop) at 3 hours of the data a second, so it
 * lasts `durationSec` (checked against the data when it loads; see tracks/domain/smog.js).
 */
function smogTrack(title, file, durationSec, loop, cover, coverCredit) {
  return {
    title,
    durationSec,
    color: '#bab8b6',
    coverUrl: `${SMOG_COVERS}/${cover}`,
    coverCredit,
    smog: { tracksDir: SMOG_TRACKS, file, loop },
  };
}

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
    // Close in on the pole, the ice large in the middle.
    globeLens: GlobeLens.WIDE,
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
    id: 'lightning',
    category: AlbumCategory.EXTREME_WEATHER,
    title: 'Lightning Crosses the Equator',
    coverUrl: `${LIGHTNING_COVERS}/americas_africa.jpg`,
    coverCredit: 'NASA, International Space Station, public domain, via Wikimedia Commons',
    dataCredit: 'Data: ISS LIS V3.0 (NASA GHRC/MSFC) · NASA SVS 5011',
    msPerSec: YEAR_MS / LIGHTNING_YEAR_SEC,
    // 2021 seen from two sides of the Earth, the globe held on the equator over each so both hemispheres are in
    // sight: the Americas and Africa, then South and East Asia with Australia (see docs/albums/lightning.md). Each
    // track strikes its northern and southern lightning on its own pair of instruments. Covers: thunderstorms of that
    // side as astronauts saw them from the space station.
    tracks: [
      {
        title: 'The Americas and Africa', durationSec: LIGHTNING_YEAR_SEC, color: '#9ec3e6',
        coverUrl: `${LIGHTNING_COVERS}/americas_africa.jpg`, coverCredit: 'Photo: ISS Expedition 20 crew, thunderstorms on the Brazilian horizon',
        lightning: { tracksDir: EXTREME_WEATHER_TRACKS, file: 'americas_africa_2021.csv', north: NorthInstrument.CELESTA, south: SouthInstrument.TAIKO },
      },
      {
        title: 'Asia and Australia', durationSec: LIGHTNING_YEAR_SEC, color: '#d9a35a',
        coverUrl: `${LIGHTNING_COVERS}/asia_australia.jpg`, coverCredit: 'Photo: ISS Expedition 49 crew, thunderstorms over South East Asia, cropped',
        lightning: { tracksDir: EXTREME_WEATHER_TRACKS, file: 'asia_australia_2021.csv', north: NorthInstrument.DULCIMER, south: SouthInstrument.MELODIC_TOM },
      },
    ],
  },
  {
    id: 'forest',
    category: AlbumCategory.BIODIVERSITY,
    title: 'Forests Hold Carbon',
    coverUrl: `${FOREST_COVERS}/cover.jpg`,
    coverCredit: 'Cover: SVS 4950, GEDI forest height · NASA Scientific Visualization Studio',
    dataCredit: 'Data: GEDI L3 (UMD, ORNL DAAC) via NASA GIBS · EIC 14696',
    // One turn of the Earth under the noon line over GEDI's map (see notebooks/forest_album.ipynb, section 8).
    tracks: [
      {
        title: 'Under the Noon Sun · 2019–2023',
        durationSec: FOREST_LINE_SEC,
        forest: {
          lineUrl: `${FOREST_TRACKS}/forest_noon_line.csv`,
          mapUrl: `${FOREST_TRACKS}/canopy_height_quarter_degree.png`,
        },
        color: '#8ecf7a',
      },
    ],
  },
  {
    id: 'hot-oceans',
    category: AlbumCategory.EXTREME_WEATHER,
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
    title: 'Mirror Storms',
    coverUrl: `${HEMISPHERES_COVERS}/hurricane_lee_2023.jpg`,
    coverCredit: 'Public domain, via Wikimedia Commons',
    dataCredit: STORMS_CREDIT,
    // Two storm seasons around 2023, the year the oceans ran hottest on record, every storm of each: one northern ocean
    // and one southern (see docs/albums/hemispheres.md). Each cover is one of the season's strongest storms.
    tracks: [
      {
        title: 'North Atlantic 2023',
        durationSec: seasonDurationSec(SEASON_SPANS.atlantic),
        color: '#7fc4e8',
        coverUrl: `${HEMISPHERES_COVERS}/hurricane_lee_2023.jpg`,
        coverCredit: 'Cover: Hurricane Lee, Sep 2023, MODIS (NASA GSFC)',
        season: {
          url: `${HEMISPHERES_DATA}/atlantic_2023.csv`,
          span: SEASON_SPANS.atlantic,
          hemisphere: Hemisphere.NORTH,
          lead: Lead.WHISTLE,
          focus: { lat: 24, lon: -59, arcDeg: NORTHERN_ARC_DEG },
        },
      },
      {
        // The southern summer of 2023, January to April, when Freddy crossed the whole ocean in the longest life of
        // any tropical cyclone on record.
        title: 'South Indian 2023',
        durationSec: seasonDurationSec(SEASON_SPANS.southIndian),
        color: '#b29ae6',
        coverUrl: `${HEMISPHERES_COVERS}/cyclone_freddy_2023.jpg`,
        coverCredit: 'Cover: Cyclone Freddy, Feb 19 2023, Suomi NPP VIIRS (NASA)',
        dataCredit: `${STORMS_CREDIT}, 14312 Freddy`,
        season: {
          url: `${HEMISPHERES_DATA}/south_indian_2023.csv`,
          span: SEASON_SPANS.southIndian,
          hemisphere: Hemisphere.SOUTH,
          lead: Lead.BOWED,
          focus: { lat: -18, lon: 80, arcDeg: SOUTHERN_ARC_DEG },
        },
      },
    ],
  },
  {
    id: 'wildfire',
    category: AlbumCategory.DISASTER,
    title: 'As the Season Burns',
    coverUrl: `${WILDFIRE_COVERS}/creek_fire_2020.jpg`,
    coverCredit: 'Photo: CAL FIRE, public domain, via Wikimedia Commons',
    dataCredit: 'Data: NIFC / NICC · MTBS (USGS, USDA Forest Service) · NASA FEDS (VEDA)',
    tracks: [
      {
        title: 'Burned Acres',
        durationSec: WILDFIRE_ANNUAL_SEC,
        // The Creek Fire, California, 8 Sep 2020: 2020 is one of the two peak years of the graph (EIC 5453).
        coverUrl: `${WILDFIRE_COVERS}/creek_fire_2020.jpg`,
        coverCredit: 'Cover: Creek Fire, California, Sep 8 2020 (CAL FIRE, public domain)',
        wildfire: {
          kind: 'annual',
          csvUrl: `${WILDFIRE_DATA}/us_annual_burned_acres.csv`,
          // Each year's large fires where they burned: NIFC's acres have no places.
          firesUrl: `${WILDFIRE_DATA}/mtbs_large_fires.csv`,
        },
      },
      {
        title: '2020 Fire Season',
        durationSec: WILDFIRE_SEASON_SEC,
        // San Francisco's "Orange Skies Day", 9 Sep 2020: the season's smoke turned a city's noon orange.
        coverUrl: `${WILDFIRE_COVERS}/orange_skies_2020.jpg`,
        coverCredit: 'Cover: Orange Skies Day, San Francisco, Sep 9 2020 (Photo: Dllu, CC BY-SA 4.0, via Wikimedia Commons)',
        wildfire: {
          kind: 'season',
          csvUrl: `${WILDFIRE_DATA}/feds_2020_daily_large_fires.csv`,
          firesUrl: `${WILDFIRE_DATA}/feds_2020_fire_days.csv`,
        },
      },
    ],
  },
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
          pathsUrl: `${AEROSOL_DATA}/paths/erin.json`,
          framesDir: AEROSOL_FRAMES,
          sound: { lead: Lead.WHISTLE, baseMidi: 57 },
        },
      },
      {
        title: 'Saharan Dust',
        durationSec: AEROSOL_TRACK_SEC,
        color: '#ff58a0',
        coverUrl: `${AEROSOL_COVERS}/saharan_dust.jpg`,
        coverCredit: 'NASA Earth Observatory image by Joshua Stevens, MODIS / Terra, Jun 18 2020',
        aerosol: {
          csvUrl: `${AEROSOL_DATA}/saharan_dust.csv`,
          pathsUrl: `${AEROSOL_DATA}/paths/saharan_dust.json`,
          framesDir: AEROSOL_FRAMES,
          sound: { lead: Lead.BOWED, baseMidi: 48 },
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
          pathsUrl: `${AEROSOL_DATA}/paths/southern_africa_smoke.json`,
          framesDir: AEROSOL_FRAMES,
          sound: { lead: Lead.VOCAL, baseMidi: 48 },
          viewLat: -12.0,
          viewLon: 5.0,
        },
      },
      {
        title: "Etna's Breath",
        durationSec: AEROSOL_TRACK_SEC,
        color: '#e0a030',
        coverUrl: `${AEROSOL_COVERS}/spain_and_etna.jpg`,
        coverCredit: 'NASA MODIS / Terra, Mt. Etna Eruption',
        aerosol: {
          csvUrl: `${AEROSOL_DATA}/spain_and_etna.csv`,
          pathsUrl: `${AEROSOL_DATA}/paths/spain_and_etna.json`,
          framesDir: AEROSOL_FRAMES,
          sound: { lead: Lead.BRASS, baseMidi: 48 },
          viewLat: 40.0,
          viewLon: 5.0,
        },
      },
    ],
  },
  {
    id: 'smog',
    category: AlbumCategory.AIR_QUALITY,
    title: 'The Wind That Sweeps the Smog',
    coverUrl: `${SMOG_COVERS}/new_york.jpg`,
    coverCredit: 'Cover: Orange haze hides Manhattan, Jun 7 2023 (Photo: Jim Griffin, CC0)',
    dataCredit: 'Data: GEOS-CF v1 (NASA GMAO) · NASA SVS 5151',
    // Songs are timed in playback ms, one hour of the data a third of a second in all of them (see tracks/domain/smog.js).
    msPerSec: 1000,
    // Four cities whose smog flows in from outside the map, covers them and passes on, each a different length (see
    // notebooks/smog_album.ipynb and docs/albums/smog.md), in time order. Each plays nell-v2's loops, heard through
    // the air over the city.
    tracks: [
      smogTrack('New York 2023', 'new_york_2023.csv', 29, SmogLoop.SYNTH_POP, 'new_york.jpg',
        'Cover: Orange haze hides Manhattan, Jun 7 2023 (Photo: Jim Griffin, CC0)'),
      smogTrack('Seoul 2025', 'seoul_2025.csv', 21, SmogLoop.HOUSE, 'seoul.jpg',
        'Cover: Seoul in smog and dust from Namsan Tower, Apr 25 2008 (Photo: taylorandayumi, CC BY 2.0)'),
      smogTrack('Shanghai 2025', 'shanghai_2025.csv', 18, SmogLoop.HOUSE, 'shanghai.jpg',
        'Cover: Lujiazui in the haze, May 28 2011 (Photo: Weixi Zeng, CC BY-SA 3.0)'),
    ],
  },
];
