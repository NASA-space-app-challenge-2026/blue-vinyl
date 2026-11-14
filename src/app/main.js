'use strict';

// Composition root: wires the features together.

import { albums } from '../features/album/data/albums.js';
import { albumDurationSec, trackBoundaries, trackCover, trackIndexAt, trackStartSec, wrapIndex } from '../features/album/domain/album.js';
import { createAlbumColumn } from '../features/album/presentation/album-column.js';
import { createAlbumCredit } from '../features/album/presentation/album-credit.js';
import { createBackdrop } from '../features/album/presentation/backdrop.js';
import { PlaybackState } from '../features/controls/domain/playback-state.js';
import { createAlbumSwitcher } from '../features/controls/presentation/album-switcher.js';
import { createFullscreenButton } from '../features/controls/presentation/fullscreen-button.js';
import { createGlassCapsule } from '../features/controls/presentation/glass-capsule.js';
import { createPlayButton } from '../features/controls/presentation/play-button.js';
import { createPlayHint } from '../features/controls/presentation/play-hint.js';
import { createSettingsMenu } from '../features/controls/presentation/settings-menu.js';
import { createVolumeControl } from '../features/controls/presentation/volume-control.js';
import { GLOBE_THEMES } from '../features/globe/data/globe-themes.js';
import { DEFAULT_GLOBE_THEME, GlobeTheme } from '../features/globe/domain/globe-theme.js';
import { createDateLabel } from '../features/globe/presentation/date-label.js';
import { createGlobeView } from '../features/globe/presentation/globe-view.js';
import { createHalo } from '../features/globe/presentation/halo.js';
import { createSeaLevelOverlay } from '../features/globe/presentation/sea-level-overlay.js';
import { createMusicPlayer } from '../features/music/data/music-player.js';
import { createSoundEngine } from '../features/music/data/sound-engine.js';
import { SOUNDFONT_CREDIT } from '../features/music/data/soundfont-bank.js';
import { FlockComposer } from '../features/music/domain/composers/flock.js';
import { HurricaneComposer } from '../features/music/domain/composers/hurricane.js';
import { iceSeaScore } from '../features/music/domain/ice-sea-score.js';
import { loadBirdTracks } from '../features/tracks/data/bird-track-source.js';
import { loadStormTrack } from '../features/tracks/data/storm-track-source.js';
import { loadIceSeaTrack } from '../features/tracks/data/track-repository.js';
import { dailyFlock, sampleFlock } from '../features/tracks/domain/bird-track.js';
import { sampleStorm, stormFadeAt, stormMsPerSec, stormTimeAt } from '../features/tracks/domain/storm-track.js';
import { YEAR_TIMELINE, yearAt } from '../features/tracks/domain/year-timeline.js';
import { createRecordSwap } from '../features/turntable/presentation/record-swap.js';
import { createTurntableView } from '../features/turntable/presentation/turntable-view.js';

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
// birds (`tracks`, `lead`) or its storm (`storm`), or null for a track with neither. Empty until then.
let songs = [];
// The song whose birds or storm the globe shows, and where they are now (the globe keeps them in the middle).
let shownSong = null;
let focus = null;
// The pole the globe looks down on for an ice track, to glide there when it changes; null for other tracks.
let shownPole = null;

let state = PlaybackState.STOPPED;
let elapsedMs = 0;
let lastFrameTs = null;
let tickFrame = null;
// True while the records change; steps asked for meanwhile add up in pendingSteps.
let swapping = false;
let pendingSteps = 0;

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
});
// The album's credits run round the record's rim.
const albumCredit = createAlbumCredit((text) => turntable.setCredit(text));

const recordSwap = createRecordSwap({ recordEl: turntable.recordEl, recordGeometry: turntable.recordGeometry, column: albumColumn });
const globe = createGlobeView(turntable.labelSlot);
const seaOverlay = createSeaLevelOverlay(turntable.labelSlot);
const music = createMusicPlayer();
globe.setFocus(() => focus);
const dateLabel = createDateLabel(turntable.labelSlot);
const halo = createHalo(turntable.haloCanvas, () => soundEngine.analyser);
new ResizeObserver(() => halo.place(turntable.labelDisc())).observe(turntable.haloCanvas);
const soundEngine = createSoundEngine();
const flockComposer = new FlockComposer();
const hurricaneComposer = new HurricaneComposer();

const transportControls = createGlassCapsule(slot('corner-bottom-left'));
const playButton = createPlayButton(transportControls, { onToggle: togglePlayback });
createVolumeControl(transportControls, {
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

document.addEventListener('keydown', (event) => {
  // Focused controls (buttons, radios) already react to Space on their own.
  if (event.code !== 'Space' || event.target.closest('button, input')) return;
  event.preventDefault();
  togglePlayback();
});

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
  turntable.setTrackStarts(trackBoundaries(album).slice(1, -1));
  songs = [];
  showSong(null, null);
  loadSongs(album);
  trackData = album.tracks.map(() => null);
  musicCredits = [];
  music.load([]);
  loadAlbumData(album);
}

/**
 * Loads the ice and sea data of the album's tracks, then builds the album's music: each track's notes, moved to where
 * the track starts. Playback that is already running picks the music up where it is.
 *
 * @param {import('../features/album/domain/album.js').Album} loading
 */
async function loadAlbumData(loading) {
  if (!loading.tracks.some((track) => track.iceSea)) return;
  let data;
  try {
    data = await Promise.all(loading.tracks.map((track) => (track.iceSea ? loadIceSeaTrack(track.iceSea) : null)));
  } catch (error) {
    console.warn('Album data unavailable:', error);
    return;
  }
  if (album !== loading) return;
  trackData = data;
  const starts = trackBoundaries(album).map((edge) => (edge * totalMs) / 1000);
  const notes = album.tracks.flatMap((track, i) => {
    if (!data[i]) return [];
    return iceSeaScore(data[i].years, track.iceSea.iceVoice, YEAR_TIMELINE, track.durationSec)
      .map((note) => ({ ...note, timeSec: note.timeSec + starts[i] }));
  });
  music.load(notes);
  musicCredits = [SOUNDFONT_CREDIT];
  if (state === PlaybackState.PLAYING) music.play(() => elapsedMs / 1000);
  render();
  globe.glide();
}

// Loads the birds or the storm of each of `target`'s tracks, unless another album is shown by then.
async function loadSongs(target) {
  if (!target.tracks.some((track) => track.birdsUrl || track.storm)) return;
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
  return null;
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
  music.unlock();
  soundEngine.unlock().catch((error) => console.error('sound engine failed to load', error));
}

// Takes one of the steps asked for meanwhile, if any; 0 when none.
function takePendingStep() {
  const step = Math.sign(pendingSteps);
  pendingSteps -= step;
  return step;
}

/**
 * Changes records, once for `step` (-1 or 1) and once more for each step asked for meanwhile: the arm lifts, the
 * record goes into its sleeve and the column of sleeves moves along to the new album, whose record comes out stopped
 * at its start. The catalog wraps around.
 */
async function switchAlbum(step) {
  if (swapping) {
    pendingSteps += step;
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
  setState(PlaybackState.CUEING);
}

function togglePlayback() {
  if (swapping) return;
  unlockSound();
  setState(state === PlaybackState.STOPPED ? PlaybackState.CUEING : PlaybackState.STOPPED);
}

function startPlaying() {
  setState(PlaybackState.PLAYING);
  music.play(() => elapsedMs / 1000);
  cancelAnimationFrame(tickFrame);
  lastFrameTs = null;
  tickFrame = requestAnimationFrame(tick);
}

function render() {
  const progress = elapsedMs / totalMs;
  const trackIndex = trackIndexAt(album, progress);
  turntable.render(state, progress, trackProgressAt(trackIndex), album.tracks[trackIndex]);
  albumColumn.render(trackIndex);
  albumCredit.render(album, trackIndex, [...musicCredits, mapCredit]);
  backdrop.show(trackCover(album, trackIndex).url);
  renderSong(trackIndex);
  renderData(trackIndex);
}

/**
 * Draws the year that plays at the clock on the globe, looking down on the track's pole: its ice and the sea level;
 * ice lost from one year to the next falls into the water. The record at rest before it plays shows the first year.
 */
function renderData(trackIndex) {
  const track = album.tracks[trackIndex];
  const data = trackData[trackIndex];
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
  const trackKey = `${album.id}:${trackIndex}`;
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
    // The lost ice falls for as long as the year's chord is held.
    fallSec: YEAR_TIMELINE.beatSec,
  });
  seaOverlay.render({
    year: year.year,
    firstYear: years[0].year,
    extent: year.extent,
    firstExtent: years[0].extent,
    seaLevelMm: year.seaLevelMm,
    waterMm,
  });
}

// Draws the birds, the date and the flock's place at the clock and, while playing, lets the music follow it.
function renderSong(trackIndex) {
  const song = songs[trackIndex];
  if (!song) {
    if (shownSong) showSong(null, null);
    return;
  }
  if (song.storm) {
    renderStorm(trackIndex, song);
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

function setState(next) {
  if (next !== PlaybackState.PLAYING) music.stop();
  state = next;
  if (state !== PlaybackState.PLAYING) soundEngine.stop();
  playHint.render(state);
  playButton.render(state);
  render();
}

function tick(ts) {
  if (state !== PlaybackState.PLAYING) return;
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
  tickFrame = requestAnimationFrame(tick);
}

showAlbum(albumIndex);
setState(PlaybackState.STOPPED);
