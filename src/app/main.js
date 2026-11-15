'use strict';

// Composition root: wires the features together.

import { albums, WILDFIRE_DAY_TIMELINE, WILDFIRE_YEAR_TIMELINE } from '../features/album/data/albums.js';
import { albumDurationSec, trackBoundaries, trackCover, trackIndexAt, trackStartSec, wrapIndex } from '../features/album/domain/album.js';
import { createAlbumColumn } from '../features/album/presentation/album-column.js';
import { createAlbumCredit } from '../features/album/presentation/album-credit.js';
import { createBackdrop } from '../features/album/presentation/backdrop.js';
import { createCatView } from '../features/cat/presentation/cat-view.js';
import { PlaybackState } from '../features/controls/domain/playback-state.js';
import { createMediaCenter } from '../features/controls/data/media-center.js';
import { createAlbumSwitcher } from '../features/controls/presentation/album-switcher.js';
import { createFullscreenButton } from '../features/controls/presentation/fullscreen-button.js';
import { createGlassCapsule } from '../features/controls/presentation/glass-capsule.js';
import { createPlayButton } from '../features/controls/presentation/play-button.js';
import { createPlayHint } from '../features/controls/presentation/play-hint.js';
import { createSettingsMenu } from '../features/controls/presentation/settings-menu.js';
import { createVolumeControl } from '../features/controls/presentation/volume-control.js';
import { GLOBE_THEMES } from '../features/globe/data/globe-themes.js';
import { DEFAULT_GLOBE_LENS } from '../features/globe/domain/globe-lens.js';
import { DEFAULT_GLOBE_THEME, GlobeTheme } from '../features/globe/domain/globe-theme.js';
import { createDateLabel } from '../features/globe/presentation/date-label.js';
import { createGlobeView } from '../features/globe/presentation/globe-view.js';
import { createHalo } from '../features/globe/presentation/halo.js';
import { createSeaLevelOverlay } from '../features/globe/presentation/sea-level-overlay.js';
import { createWildfireOverlay } from '../features/globe/presentation/wildfire-overlay.js';
import { createMusicPlayer } from '../features/music/data/music-player.js';
import { createSoundEngine } from '../features/music/data/sound-engine.js';
import { SOUNDFONT_CREDIT } from '../features/music/data/soundfont-bank.js';
import { FlockComposer } from '../features/music/domain/composers/flock.js';
import { HurricaneComposer } from '../features/music/domain/composers/hurricane.js';
import { LightningComposer } from '../features/music/domain/composers/lightning.js';
import { seasonSong, StormSeasonComposer } from '../features/music/domain/composers/storm-season.js';
import { iceSeaScore } from '../features/music/domain/ice-sea-score.js';
import { annualBurnScore, seasonScore } from '../features/music/domain/wildfire-score.js';
import { loadBirdTracks } from '../features/tracks/data/bird-track-source.js';
import { loadLightningTrack } from '../features/tracks/data/lightning-season-source.js';
import { loadStormSeason } from '../features/tracks/data/storm-season-source.js';
import { loadStormTrack } from '../features/tracks/data/storm-track-source.js';
import { loadIceSeaTrack, loadWildfireTrack } from '../features/tracks/data/track-repository.js';
import { dailyFlock, sampleFlock } from '../features/tracks/domain/bird-track.js';
import { seasonTimeAt } from '../features/tracks/domain/storm-season.js';
import { sampleStorm, stormFadeAt, stormMsPerSec, stormTimeAt } from '../features/tracks/domain/storm-track.js';
import { YEAR_TIMELINE, yearAt } from '../features/tracks/domain/year-timeline.js';
import { createRecordSwap } from '../features/turntable/presentation/record-swap.js';
import { createTurntableView } from '../features/turntable/presentation/turntable-view.js';
import { rectInScreen } from '../shared/screen-space.js';
import { createTicker } from '../shared/ticker.js';

// The contiguous United States, zoomed until the label's edge is 30 degrees of arc from its middle, so the West's fires
// and the burn field read large.
const CONUS_FOCUS = Object.freeze({ lat: 39, lon: -98, arcDeg: 30 });

// Set by showAlbum().
let albumIndex = 0;
let album;
let totalMs;
// Data of each track of the album, by track index; null until loaded, and for tracks without data.
/** @type {(import('../features/tracks/data/track-repository.js').IceSeaTrackData | null)[]} */
let trackData = [];
// Credits added once the album's music is built, such as the SoundFont the ice is played on.
let musicCredits = [];
// The attribution of the globe's map and imagery, shown with the album's credits.
let mapCredit = '';
// What each track of the album plays, by track index, once its data has loaded (see the Song of sound-engine.js): its
// birds (`tracks`, `lead`), its storm (`storm`) or its year of lightning (`lightning`), or null for a track with none
// of them. Empty until then.
let songs = [];
// The storm season each track of the album plays, by track index, once loaded (see seasonSong), or null for a track
// without one; empty until then. The season the globe shows.
let seasons = [];
let shownSeason = null;
// The song whose birds, storm or lightning the globe shows, and where they are now (the globe keeps them in the middle).
let shownSong = null;
let focus = null;
// The pole the globe looks down on for an ice track, to glide there when it changes; null for other tracks.
let shownPole = null;
// What a wildfire track shows now (album, track and year or day), so the globe changes only when it does; null when
// no wildfire track is shown.
let shownFireKey = null;

let state = PlaybackState.STOPPED;
let elapsedMs = 0;
let lastFrameTs = null;
// True while the records change; steps asked for meanwhile add up in pendingSteps.
let swapping = false;
let pendingSteps = 0;
// True while a hand holds the record that was playing.
let handHeld = false;

const slot = (id) => document.getElementById(id);

const backdrop = createBackdrop(document.documentElement);
const playHint = createPlayHint(slot('bottom-center'));

const albumColumn = createAlbumColumn(slot('stage'), albums, { onSelectTrack: playFromTrack });
const turntable = createTurntableView(slot('stage'), {
  onToggle: togglePlayback,
  onCued: () => {
    if (state === PlaybackState.CUEING) startPlaying();
  },
  onGrab: () => {
    unlockSound();
    setState(PlaybackState.SCRUBBING);
  },
  onScrub: (progress) => {
    if (progress === null) return;
    elapsedMs = progress * totalMs;
    render();
    globe.glide();
  },
  onDrop: (progress) => {
    elapsedMs = progress * totalMs;
    startPlaying();
  },
  onLift: () => setState(PlaybackState.STOPPED),
  onSeek: seekTrack,
  onSelectGroove: (progress) => playFromTrack(trackIndexAt(album, progress)),
  // A hand on the playing record pauses it; turning it moves the music forward or back as far as it is turned, and
  // letting go plays on from there.
  onHandHold: () => {
    if (state !== PlaybackState.PLAYING) return;
    handHeld = true;
    setState(PlaybackState.HELD);
  },
  onHandTurn: (sec) => {
    if (!handHeld || state !== PlaybackState.HELD) return;
    elapsedMs = Math.min(totalMs - 1, Math.max(0, elapsedMs + sec * 1000));
    render();
    globe.glide();
  },
  onHandRelease: () => {
    if (!handHeld) return;
    handHeld = false;
    if (state === PlaybackState.HELD) startPlaying();
  },
});
// The album's credits run round the record's rim.
const albumCredit = createAlbumCredit((text) => turntable.setCredit(text));

const recordSwap = createRecordSwap({
  recordEl: turntable.recordEl,
  recordGeometry: turntable.recordGeometry,
  rectOf: (el) => rectInScreen(slot('screen'), el),
  column: albumColumn,
});
const globe = createGlobeView(turntable.labelSlot);
const seaOverlay = createSeaLevelOverlay(turntable.labelSlot);
const wildfireOverlay = createWildfireOverlay(turntable.labelSlot);
const music = createMusicPlayer();
globe.setFocus(() => focus);
const dateLabel = createDateLabel(turntable.labelSlot);
const halo = createHalo(turntable.haloCanvas, () => soundEngine.analyser);
new ResizeObserver(() => halo.place(turntable.labelDisc())).observe(turntable.haloCanvas);
const soundEngine = createSoundEngine();
const flockComposer = new FlockComposer();
const hurricaneComposer = new HurricaneComposer();
const lightningComposer = new LightningComposer();
const ticker = createTicker(tick);
// The system's media controls play and pause, and step through the tracks, on into the next or previous album.
const mediaCenter = createMediaCenter({
  onPlay: () => {
    if (state === PlaybackState.STOPPED) togglePlayback();
  },
  onPause: () => {
    if (state === PlaybackState.PLAYING || state === PlaybackState.CUEING) togglePlayback();
  },
  onPrevious: () => stepTrack(-1),
  onNext: () => stepTrack(1),
});

const transportControls = createGlassCapsule(slot('corner-bottom-left'));
const playButton = createPlayButton(transportControls, { onToggle: togglePlayback });
const volumeControl = createVolumeControl(transportControls, {
  onChange: (level) => {
    music.setVolume(level);
    soundEngine.setVolume(level);
  },
});
const albumControls = createGlassCapsule(slot('corner-bottom-left'));
createAlbumSwitcher(albumControls, {
  onPrevious: () => switchAlbum(-1),
  onNext: () => switchAlbum(1),
});
const viewControls = createGlassCapsule(slot('corner-top-right'));
createFullscreenButton(viewControls);
createSettingsMenu(viewControls, {
  globeThemes: Object.values(GlobeTheme).map((theme) => ({ value: theme, label: GLOBE_THEMES[theme].label })),
  globeTheme: DEFAULT_GLOBE_THEME,
  onGlobeThemeChange: applyGlobeTheme,
});
applyGlobeTheme(DEFAULT_GLOBE_THEME);
createCatView(slot('screen'));

// Album switch keys, as the previous and next chevrons.
const ALBUM_KEYS = Object.freeze({ ArrowLeft: -1, ArrowRight: 1 });
// Volume keys: up louder, down quieter.
const VOLUME_KEYS = Object.freeze({ ArrowUp: 1, ArrowDown: -1 });

// Space always plays or pauses, left and right switch albums and up and down set the volume, wherever the focus is.
// Captured before any control sees the key, so a button left focused by a click is not pressed again.
document.addEventListener(
  'keydown',
  (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'Space') {
      event.preventDefault();
      releaseClickFocus();
      if (!event.repeat) togglePlayback();
      return;
    }
    const albumStep = ALBUM_KEYS[event.key];
    const volumeStep = VOLUME_KEYS[event.key];
    if (!albumStep && !volumeStep) return;
    // The volume slider and the theme radios keep their arrows while used from the keyboard.
    if (event.target instanceof HTMLInputElement && event.target !== clickFocused) return;
    event.preventDefault();
    releaseClickFocus();
    // Holding an up or down key keeps turning the volume; holding left or right switches albums once.
    if (volumeStep) volumeControl.step(volumeStep);
    else if (!event.repeat) switchAlbum(albumStep);
  },
  { capture: true },
);
// The control a click focused, which shows no focus ring until a key is pressed. Focus reached from the keyboard
// shows its ring at once and is not kept here.
let clickFocused = null;
document.addEventListener('focusin', (event) => {
  clickFocused = event.target instanceof HTMLElement && !event.target.matches(':focus-visible') ? event.target : null;
});

/** Lets go of the focus a click left on a control, before the key would light up its focus ring. */
function releaseClickFocus() {
  if (clickFocused && clickFocused === document.activeElement) clickFocused.blur();
  clickFocused = null;
}

// A focused button is pressed on Space's keyup, so that is held back too.
document.addEventListener(
  'keyup',
  (event) => {
    if (event.code === 'Space') event.preventDefault();
  },
  { capture: true },
);

function applyGlobeTheme(theme) {
  globe.setTheme(theme, GLOBE_THEMES[theme]);
  mapCredit = GLOBE_THEMES[theme].attribution;
  if (album) render();
}

function showAlbum(index) {
  albumIndex = index;
  album = albums[albumIndex];
  totalMs = albumDurationSec(album) * 1000;
  albumColumn.setAlbum(albumIndex);
  globe.setLens(album.globeLens ?? DEFAULT_GLOBE_LENS);
  turntable.setTrackStarts(trackBoundaries(album).slice(1, -1));
  songs = [];
  showSong(null, null);
  loadSongs(album);
  seasons = [];
  showSeason(null, null);
  loadSeasons(album);
  trackData = album.tracks.map(() => null);
  musicCredits = [];
  music.load([]);
  loadAlbumData(album);
}

/**
 * Loads score-driven track data (ice/sea or wildfire), then builds the album's music: each track's notes, moved to
 * where the track starts. Playback that is already running picks the music up where it is.
 *
 * @param {import('../features/album/domain/album.js').Album} loading
 */
async function loadAlbumData(loading) {
  const hasIce = loading.tracks.some((track) => track.iceSea);
  const hasFire = loading.tracks.some((track) => track.wildfire);
  if (!hasIce && !hasFire) return;
  let data;
  try {
    data = await Promise.all(
      loading.tracks.map((track) => {
        if (track.iceSea) return loadIceSeaTrack(track.iceSea);
        if (track.wildfire) return loadWildfireTrack(track.wildfire);
        return null;
      }),
    );
  } catch (error) {
    console.warn('Album data unavailable:', error);
    return;
  }
  if (album !== loading) return;
  trackData = data;
  // Only ice tracks have ice to prepare; wildfire tracks have data but no ice.
  data.forEach((track, i) => {
    const { iceSea } = album.tracks[i];
    if (track && iceSea) globe.prepareIce({ key: iceKey(album, i), poleLat: iceSea.poleLat, shapes: track.iceShapes });
  });
  const starts = trackBoundaries(album).map((edge) => (edge * totalMs) / 1000);
  const notes = album.tracks.flatMap((track, i) => {
    if (!data[i]) return [];
    const offset = starts[i];
    if (track.iceSea) {
      return iceSeaScore(data[i].years, track.iceSea.iceVoice, YEAR_TIMELINE, track.durationSec).map((note) => ({
        ...note,
        timeSec: note.timeSec + offset,
      }));
    }
    if (track.wildfire?.kind === 'annual') {
      return annualBurnScore(data[i].years, WILDFIRE_YEAR_TIMELINE, track.durationSec).map((note) => ({
        ...note,
        timeSec: note.timeSec + offset,
      }));
    }
    if (track.wildfire?.kind === 'season') {
      return seasonScore(data[i].days, WILDFIRE_DAY_TIMELINE, track.durationSec).map((note) => ({
        ...note,
        timeSec: note.timeSec + offset,
      }));
    }
    return [];
  });
  music.load(notes);
  musicCredits = [SOUNDFONT_CREDIT];
  if (state === PlaybackState.PLAYING) music.play(() => elapsedMs / 1000);
  render();
  globe.glide();
}

// Loads the birds, the storm or the lightning of each of `target`'s tracks, unless another album is shown by then.
async function loadSongs(target) {
  if (!target.tracks.some((track) => track.birdsUrl || track.storm || track.lightning)) return;
  let perTrack;
  try {
    perTrack = await Promise.all(target.tracks.map((track) => loadSong(track, target)));
  } catch (error) {
    console.warn('Album data unavailable:', error);
    return;
  }
  if (album !== target) return;
  songs = withFastestWind(perTrack);
  render();
  globe.glide();
}

// Gives each storm song the album's strongest wind, which its tempo is in proportion to (tempoOf).
function withFastestWind(perTrack) {
  const winds = perTrack.filter((song) => song?.storm).flatMap((song) => song.track.windKt);
  if (!winds.length) return perTrack;
  const fastestKt = Math.max(...winds);
  return perTrack.map((song) => (song?.storm ? { ...song, fastestKt } : song));
}

/**
 * @param {import('../features/album/domain/album.js').Track} track
 * @param {import('../features/album/domain/album.js').Album} target the album it is on
 * @returns {Promise<import('../features/music/data/sound-engine.js').Song | null>}
 */
async function loadSong(track, target) {
  if (track.birdsUrl) {
    const tracks = await loadBirdTracks(track.birdsUrl);
    return {
      tracks,
      lead: track.lead,
      composer: flockComposer,
      startMs: 0,
      msPerSec: target.msPerSec,
      sampleAt: (time) => sampleFlock(tracks, time),
      path: dailyFlock(tracks),
    };
  }
  if (track.storm) {
    const stormTrack = await loadStormTrack(track.storm);
    return {
      storm: true,
      track: stormTrack,
      kit: track.storm.kit,
      composer: hurricaneComposer,
      startMs: stormTrack.t[0],
      msPerSec: stormMsPerSec(stormTrack, track.durationSec),
      sampleAt: (time) => sampleStorm(stormTrack, time),
      path: stormTrack.t.map((_, i) => ({ lat: stormTrack.lat[i], lon: stormTrack.lon[i] })),
    };
  }
  if (track.lightning) {
    const { season, view } = await loadLightningTrack(track.lightning);
    return {
      lightning: true,
      season,
      view,
      north: track.lightning.north,
      south: track.lightning.south,
      composer: lightningComposer,
      startMs: season.t[0],
      msPerSec: target.msPerSec,
      // The whole year plays; the composer reads the season at each step's time.
      sampleAt: () => season,
    };
  }
  return null;
}

// Loads the storms of `target`'s season tracks, unless another album is shown by then. Each track's storms sing on
// a composer of their own, set to the track's lead and hemisphere.
async function loadSeasons(target) {
  if (!target.tracks.some((track) => track.season)) return;
  const perTrack = await Promise.all(target.tracks.map((track) => (track.season ? loadStormSeason(track.season.url) : null)));
  if (album !== target) return;
  seasons = perTrack.map((tracks, i) => {
    if (!tracks) return null;
    const { season, durationSec } = target.tracks[i];
    const composer = new StormSeasonComposer(season.lead, season.hemisphere);
    return seasonSong(composer, tracks, season.span, durationSec, season.focus);
  });
  render();
  globe.glide();
}

// Shows `song`'s season on the globe, the glow in `color`; null takes the storms off.
function showSeason(song, color) {
  shownSeason = song;
  globe.storms.reset(color);
  if (!song) return;
  focus = song.focus;
  halo.setColor(color);
  globe.glide();
}

// Puts `song`'s birds on the globe in `color`, and the glow in it; null takes them off. A storm's song clears the
// birds and draws its storm instead (renderStorm).
function showSong(song, color) {
  shownSong = song;
  focus = null;
  globe.birds.reset(color);
  globe.storm.show(null);
  halo.setSwirl(song?.storm ? () => globe.storm.swirl : null);
  dateLabel.show(null);
  if (color) halo.setColor(color);
}

// Audio may only start from a user gesture, so every gesture that can start playback unlocks it.
function unlockSound() {
  mediaCenter.unlock();
  music.unlock();
  soundEngine.unlock().catch((error) => console.error('sound engine failed to load', error));
}
document.addEventListener('pointerdown', unlockSound, { once: true });

// Takes one of the steps asked for meanwhile, if any; 0 when none.
function takePendingStep() {
  const step = Math.sign(pendingSteps);
  pendingSteps -= step;
  return step;
}

/**
 * Changes records, once for `step` (-1 or 1) and once more for each step asked for meanwhile, even while the new
 * record is being drawn out (see createRecordSwap): the arm lifts, the record goes into its sleeve and the column of
 * sleeves moves along to the new album, whose record comes out stopped at its start. The catalog wraps around.
 */
async function switchAlbum(step) {
  if (swapping) {
    if (recordSwap.skip()) pendingSteps += step;
    return;
  }
  swapping = true;
  // Nothing on the stage can be touched while the records change.
  slot('stage').inert = true;
  elapsedMs = 0;
  setState(PlaybackState.STOPPED);
  try {
    await recordSwap.play(step, (direction) => {
      showAlbum(wrapIndex(albumIndex + direction, albums.length));
      render();
    }, takePendingStep);
  } finally {
    pendingSteps = 0;
    slot('stage').inert = false;
    swapping = false;
  }
}

/**
 * Plays the track `step` (-1 or 1) away from the current one. Past either end of the album it switches to the album
 * next to it, as switchAlbum does, and plays its first track going forward or its last going back. A hidden page draws
 * no frames for the records to change by, so there the album changes at once.
 */
async function stepTrack(step) {
  if (swapping) return;
  const next = trackIndexAt(album, elapsedMs / totalMs) + step;
  if (next >= 0 && next < album.tracks.length) {
    playFromTrack(next);
    return;
  }
  if (document.hidden) {
    elapsedMs = 0;
    setState(PlaybackState.STOPPED);
    showAlbum(wrapIndex(albumIndex + step, albums.length));
  } else {
    await switchAlbum(step);
  }
  playFromTrack(step > 0 ? 0 : album.tracks.length - 1);
}

// 0..1 through the track at `trackIndex`.
function trackProgressAt(trackIndex) {
  return (elapsedMs / 1000 - trackStartSec(album, trackIndex)) / album.tracks[trackIndex].durationSec;
}

// Plays the current track from `trackProgress` (0..1) on: the arm moves there, and sets down first if it was off.
function seekTrack(trackProgress) {
  if (swapping) return;
  const trackIndex = trackIndexAt(album, elapsedMs / totalMs);
  seekTo((trackStartSec(album, trackIndex) + trackProgress * album.tracks[trackIndex].durationSec) * 1000);
}

// Plays the track at `trackIndex` from its start, as seekTrack does.
function playFromTrack(trackIndex) {
  if (swapping) return;
  seekTo(trackStartSec(album, trackIndex) * 1000);
}

function seekTo(ms) {
  elapsedMs = ms;
  globe.glide();
  if (state === PlaybackState.PLAYING) {
    // The ice and sea music sets the clock while it plays, so it starts again from the new place.
    music.play(() => elapsedMs / 1000);
    render();
    return;
  }
  unlockSound();
  cue();
}

function togglePlayback() {
  if (swapping) return;
  unlockSound();
  if (state === PlaybackState.STOPPED) cue();
  else setState(PlaybackState.STOPPED);
}

// A page hidden while the tonearm moves would wait for it until shown again, so it plays at once.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === PlaybackState.CUEING) startPlaying();
});

// Sets the tonearm down to play. A hidden page draws no frames, so the arm cannot move there: it plays at once.
function cue() {
  if (document.hidden) startPlaying();
  else setState(PlaybackState.CUEING);
}

function startPlaying() {
  setState(PlaybackState.PLAYING);
  music.play(() => elapsedMs / 1000);
  lastFrameTs = null;
  ticker.start();
}

function render() {
  const progress = elapsedMs / totalMs;
  const trackIndex = trackIndexAt(album, progress);
  turntable.render(state, progress, trackProgressAt(trackIndex), album.tracks[trackIndex]);
  albumColumn.render(trackIndex);
  albumCredit.render(album, trackIndex, [...musicCredits, mapCredit]);
  backdrop.show(trackCover(album, trackIndex).url);
  mediaCenter.setTrack({
    key: `${album.id}:${trackIndex}`,
    title: album.tracks[trackIndex].title,
    album: album.title,
    artworkUrl: trackCover(album, trackIndex).url,
  });
  renderSong(trackIndex);
  renderData(trackIndex);
  renderSeason(trackIndex);
}

// Draws the season at the clock on the globe, held over its ocean, with the date; while playing, the music follows it.
function renderSeason(trackIndex) {
  const song = seasons[trackIndex] ?? null;
  if (shownSeason !== song) showSeason(song, album.tracks[trackIndex].color);
  if (!song) return;
  const trackSec = elapsedMs / 1000 - trackStartSec(album, trackIndex);
  const time = seasonTimeAt(song.span, song.durationSec, trackSec);
  globe.storms.render(song.tracks, time);
  dateLabel.show(time);
  if (state !== PlaybackState.PLAYING) return;
  soundEngine.follow(song, trackSec);
  halo.wake();
}

// Names a track's ice on the globe.
function iceKey(shown, trackIndex) {
  return `${shown.id}:${trackIndex}`;
}

/**
 * Draws the year that plays at the clock on the globe, looking down on the track's pole: its ice and the sea level;
 * ice lost from one year to the next falls into the water. The record at rest before it plays shows the first year.
 * Wildfire tracks look at CONUS and show acres / active fires instead.
 */
function renderData(trackIndex) {
  const track = album.tracks[trackIndex];
  const data = trackData[trackIndex];
  if (track.wildfire && data) {
    renderWildfire(data, trackIndex);
    return;
  }
  if (shownFireKey !== null) {
    shownFireKey = null;
    wildfireOverlay.render(null);
    globe.showFires(null);
    dateLabel.show(null);
  }
  if (!track.iceSea || !data) {
    shownPole = null;
    globe.showIce(null);
    seaOverlay.render(null);
    return;
  }
  // Exactly over the pole the camera's orientation is undefined, so look from just short of it.
  focus = { lat: Math.max(-89, Math.min(89, track.iceSea.poleLat)), lon: 0 };
  if (shownPole !== track.iceSea.poleLat) {
    shownPole = track.iceSea.poleLat;
    globe.glide();
  }
  const trackSec = elapsedMs / 1000 - trackStartSec(album, trackIndex);
  const { years } = data;
  const now = yearAt(YEAR_TIMELINE, trackSec, years.length);
  const at = Math.max(0, now.index);
  const trackKey = iceKey(album, trackIndex);
  const year = years[at];
  // Share of this year's bar played: the ice moves from last year's shape to this year's over the bar, starting on
  // the chord and settling into the shape. The water rises from last year's level to this year's over the bar too,
  // from the downbeat, where the sea's string note and wave stroke sound.
  const along = now.index < 0 ? 0 : Math.min(1, now.beatSec / YEAR_TIMELINE.beatSec);
  const settle = 1 - (1 - along) ** 3;
  const rising = along;
  const before = years[Math.max(0, at - 1)];
  const waterMm = before.seaLevelMm + (year.seaLevelMm - before.seaLevelMm) * (1 - (1 - rising) ** 2);
  globe.setWaterLine(seaOverlay.waterLine(waterMm));
  globe.showIce({
    key: trackKey,
    poleLat: track.iceSea.poleLat,
    shapes: data.iceShapes,
    at: at === 0 ? 0 : at - 1 + settle,
    year: at,
    // The lost ice falls for as long as the year's chord is held.
    fallSec: YEAR_TIMELINE.beatSec,
  });
  seaOverlay.render({
    year: year.year,
    waterMm,
  });
}

/**
 * Draws the year or day of a wildfire track that plays at the clock, looking at the contiguous United States: the
 * year's burn field over the West (Burned Acres), or each large fire's scar, front and smoke that day (2020 Fire
 * Season). The globe and the read-out change only when the year or day does; the fires ease and flicker by themselves.
 *
 * @param {import('../features/tracks/data/track-repository.js').WildfireTrackData} data
 * @param {number} trackIndex
 */
function renderWildfire(data, trackIndex) {
  const trackSec = elapsedMs / 1000 - trackStartSec(album, trackIndex);
  const timeline = data.kind === 'annual' ? WILDFIRE_YEAR_TIMELINE : WILDFIRE_DAY_TIMELINE;
  const count = data.kind === 'annual' ? data.years.length : data.days.length;
  const at = Math.max(0, yearAt(timeline, trackSec, count).index);
  const key = `${album.id}:${trackIndex}:${at}`;
  focus = CONUS_FOCUS;
  if (key === shownFireKey) return;
  if (shownFireKey === null) {
    shownPole = null;
    globe.showIce(null);
    seaOverlay.render(null);
    globe.glide();
  }
  shownFireKey = key;

  if (data.kind === 'annual') {
    const year = data.years[at];
    globe.showFires({ mode: 'annual', acres: year.acres, acresMax: data.acresMax });
    const acresM = (year.acres / 1e6).toFixed(1);
    wildfireOverlay.render({
      title: String(year.year),
      detail: year.isTop10 ? `${acresM} M acres · among the 10 largest` : `${acresM} M acres burned`,
    });
    dateLabel.show(null);
    return;
  }

  const day = data.days[at];
  globe.showFires({ mode: 'season', day: at, fires: data.fires });
  // The date itself is on the date label.
  wildfireOverlay.render({
    detail: `${Math.round(day.areaKm2).toLocaleString('en')} km² active · ${day.nFires} large fires`,
  });
  dateLabel.show(Date.parse(`${day.day}T12:00:00Z`));
}

// Draws the birds, the date and the flock's place at the clock and, while playing, lets the music follow it.
function renderSong(trackIndex) {
  const song = songs[trackIndex];
  if (!song?.lightning) globe.lightning.render(null, 0, 1);
  if (!song) {
    if (shownSong) showSong(null, null);
    return;
  }
  if (song.storm) {
    renderStorm(trackIndex, song);
    return;
  }
  if (song.lightning) {
    renderLightning(trackIndex, song);
    return;
  }
  if (shownSong !== song) {
    showSong(song, album.tracks[trackIndex].color);
    globe.glide();
  }
  const elapsedSec = elapsedMs / 1000 - trackStartSec(album, trackIndex);
  const time = elapsedSec * album.msPerSec;
  globe.birds.render(song.tracks, time);
  dateLabel.show(time);
  focus = sampleFlock(song.tracks, time) ?? focus;
  if (state !== PlaybackState.PLAYING) return;
  soundEngine.follow(song, elapsedSec);
  halo.wake();
}

/**
 * Draws the storm at the clock, its wind and the date; the globe keeps it in the middle and the glow takes its colour.
 * While playing, the music follows it.
 */
function renderStorm(trackIndex, song) {
  const { durationSec } = album.tracks[trackIndex];
  if (shownSong !== song) {
    showSong(song, null);
    globe.glide();
  }
  const sec = elapsedMs / 1000 - trackStartSec(album, trackIndex);
  const time = stormTimeAt(song.track, sec, durationSec);
  const sample = sampleStorm(song.track, time);
  const fade = stormFadeAt(sec, durationSec);
  globe.storm.show({ sample, fade });
  const color = globe.storm.color;
  if (color) halo.setColor(color);
  dateLabel.show(time);
  focus = { lat: sample.lat, lon: sample.lon };
  if (state !== PlaybackState.PLAYING) return;
  soundEngine.follow(song, sec);
  halo.wake();
}

/**
 * Draws the year of lightning that plays at the clock on the globe, which looks at the equator from the track's side
 * of the Earth, with the date; while playing, lets the music follow it.
 */
function renderLightning(trackIndex, song) {
  if (shownSong !== song) {
    showSong(song, album.tracks[trackIndex].color);
    globe.glide();
  }
  focus = { lat: song.view.lat, lon: song.view.lon };
  const elapsedSec = elapsedMs / 1000 - trackStartSec(album, trackIndex);
  const time = song.startMs + elapsedSec * song.msPerSec;
  globe.lightning.render(song.season, time, song.msPerSec);
  dateLabel.show(time);
  if (state !== PlaybackState.PLAYING) return;
  soundEngine.follow(song, elapsedSec);
  halo.wake();
}

function setState(next) {
  if (next !== PlaybackState.PLAYING) music.stop();
  state = next;
  if (state !== PlaybackState.PLAYING) soundEngine.stop();
  mediaCenter.setPlaying(state === PlaybackState.PLAYING || state === PlaybackState.CUEING);
  playHint.render(state);
  playButton.render(state);
  render();
}

function tick(ts) {
  if (state !== PlaybackState.PLAYING) {
    ticker.stop();
    return;
  }
  const dtMs = lastFrameTs === null ? 0 : ts - lastFrameTs;
  // The ice and sea music sets the clock while it plays, so the globe follows what is heard; otherwise the frames do.
  const heardSec = music.positionSec();
  if (heardSec !== null) elapsedMs = heardSec * 1000;
  else elapsedMs += dtMs;
  lastFrameTs = ts;
  if (elapsedMs >= totalMs) {
    elapsedMs = 0;
    setState(PlaybackState.STOPPED);
    return;
  }
  render();
  if (!globe.gliding) globe.follow(dtMs / 1000);
}

showAlbum(albumIndex);
setState(PlaybackState.STOPPED);
