import { loadAerosolTrack } from '../features/tracks/data/aerosol-track-source.js';
import { sampleAerosol } from '../features/tracks/domain/aerosol-track.js';
import { aerosolScore } from '../features/music/domain/aerosol-score.js';
import { createParticleToggles } from '../features/controls/presentation/particle-toggles.js';
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
import { createGlobeAttribution } from '../features/globe/presentation/globe-attribution.js';
import { createGlobeView } from '../features/globe/presentation/globe-view.js';
import { createHalo } from '../features/globe/presentation/halo.js';
import { createSeaLevelOverlay } from '../features/globe/presentation/sea-level-overlay.js';
import { createMusicPlayer } from '../features/music/data/music-player.js';
import { createSoundEngine } from '../features/music/data/sound-engine.js';
import { SOUNDFONT_CREDIT } from '../features/music/data/soundfont-bank.js';
import { FlockComposer } from '../features/music/domain/composers/flock.js';
import { iceSeaScore } from '../features/music/domain/ice-sea-score.js';
import { loadBirdTracks } from '../features/tracks/data/bird-track-source.js';
import { loadIceSeaTrack } from '../features/tracks/data/track-repository.js';
import { sampleFlock } from '../features/tracks/domain/bird-track.js';
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
let aerosolData = [];
let allAerosolNotes = [];
let aerosolToggles = { salt: true, dust: true, smoke: true, sulfate: true };
// Credits added once the album's music is built, such as the SoundFont the ice is played on.
let musicCredits = [];
// What each track of the album plays, by track index, once its birds have loaded: { tracks, lead }, or null for a
// track without birds. Empty until then.
let songs = [];
// The song whose birds the globe shows, and where its flock is now (the globe keeps it in the middle).
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

const albumCredit = createAlbumCredit(slot('corner-bottom-right'));
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
const particleToggles = createParticleToggles(turntable.label, (toggles) => {
  aerosolToggles = toggles;
  globe.aerosol.setToggles(toggles);
  applyAerosolScore();
});
const recordSwap = createRecordSwap({ recordEl: turntable.recordEl, recordGeometry: turntable.recordGeometry, column: albumColumn });
const globe = createGlobeView(turntable.labelSlot);
const seaOverlay = createSeaLevelOverlay(turntable.labelSlot);
const music = createMusicPlayer();
const globeAttribution = createGlobeAttribution(slot('corner-bottom-right'));
globe.setFocus(() => focus);
const dateLabel = createDateLabel(turntable.labelSlot);
const halo = createHalo(turntable.haloCanvas, () => soundEngine.analyser);
new ResizeObserver(() => halo.place(turntable.labelDisc())).observe(turntable.haloCanvas);
const soundEngine = createSoundEngine({ composer: new FlockComposer() });

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

// Album switch keys, as the previous and next chevrons.
const ALBUM_KEYS = Object.freeze({ ArrowLeft: -1, ArrowRight: 1 });

// Space always plays or pauses, and the arrows switch albums, wherever the focus is.
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
    const direction = ALBUM_KEYS[event.key];
    if (!direction) return;
    // The volume slider and the theme radios keep their arrows while used from the keyboard.
    if (event.target instanceof HTMLInputElement && event.target !== clickFocused) return;
    event.preventDefault();
    releaseClickFocus();
    if (!event.repeat) switchAlbum(direction);
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
  globeAttribution.render(GLOBE_THEMES[theme].attribution);
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
  aerosolData = album.tracks.map(() => null);
  allAerosolNotes = [];
  loadAerosolData(album);
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

// Loads the birds of `target`'s tracks, unless another album is shown by then.
async function loadSongs(target) {
  if (!target.tracks.some((track) => track.birdsUrl)) return;
  const perTrack = await Promise.all(target.tracks.map((track) => (track.birdsUrl ? loadBirdTracks(track.birdsUrl) : null)));
  if (album !== target) return;
  songs = perTrack.map((tracks, i) => tracks && { tracks, lead: target.tracks[i].lead, msPerSec: target.msPerSec });
  render();
  globe.glide();
}

// Puts `song`'s birds on the globe in `color`, and the glow in it; null takes them off.
function showSong(song, color) {
  shownSong = song;
  focus = null;
  globe.birds.reset(color);
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
  albumCredit.render(album, trackIndex, musicCredits);
  backdrop.show(trackCover(album, trackIndex).url);
  renderSong(trackIndex);
  renderData(trackIndex);
  renderAerosol(trackIndex);
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

async function loadAerosolData(loading) {
  if (!loading.tracks.some((track) => track.aerosol)) return;
  let data;
  try {
    data = await Promise.all(loading.tracks.map((track) => (track.aerosol ? loadAerosolTrack(track.aerosol) : null)));
  } catch (error) {
    console.warn('Aerosol data unavailable:', error);
    return;
  }
  if (album !== loading) return;
  aerosolData = data;
  const starts = trackBoundaries(album).map((edge) => (edge * totalMs) / 1000);
  allAerosolNotes = album.tracks.flatMap((track, i) => {
    if (!data[i]) return [];
    return aerosolScore(data[i].records, track.durationSec, track)
      .map((note) => ({ ...note, timeSec: note.timeSec + starts[i] }));
  });
  applyAerosolScore();
  musicCredits = [SOUNDFONT_CREDIT, 'Data: NASA GMAO GEOS-FP · NOAA NHC'];
  if (state === PlaybackState.PLAYING) music.play(() => elapsedMs / 1000);
  render();
  globe.glide();
}

function applyAerosolScore() {
  if (!album.tracks.some((track) => track.aerosol)) return;
  const activeNotes = allAerosolNotes.filter((n) => {
    if (n.part === 'salt') return aerosolToggles.salt;
    if (n.part === 'dust') return aerosolToggles.dust;
    if (n.part === 'smoke') return aerosolToggles.smoke;
    if (n.part === 'sulfate') return aerosolToggles.sulfate;
    return true;
  });
  music.load(activeNotes);
  if (state === PlaybackState.PLAYING) {
    music.play(() => elapsedMs / 1000);
  }
}

function renderAerosol(trackIndex) {
  const track = album.tracks[trackIndex];
  const data = aerosolData[trackIndex];
  if (album?.id !== 'aerosol' || !track?.aerosol || !data) {
    globe.aerosol.hide();
    particleToggles.hide();
    return;
  }
  particleToggles.show();
  const trackSec = Math.max(0, elapsedMs / 1000 - trackStartSec(album, trackIndex));
  globe.aerosol.render(data.frames, trackSec, track.durationSec);

  if (track.aerosol.trackEye) {
    const s = sampleAerosol(data.records, trackSec / track.durationSec);
    if (s) focus = { lat: s.current.viewLat, lon: s.current.viewLon };
  } else if (track.aerosol.viewLat !== undefined) {
    focus = { lat: track.aerosol.viewLat, lon: track.aerosol.viewLon };
  }

  if (track.color) halo.setColor(track.color);
  if (state === PlaybackState.PLAYING) halo.wake();
}

function renderSong(trackIndex) {
  const song = songs[trackIndex];
  if (!song) return;
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
