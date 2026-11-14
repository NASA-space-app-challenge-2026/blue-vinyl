'use strict';

// Composition root: wires the features together.

import { albums } from '../features/album/data/albums.js';
import { albumDurationSec, trackBoundaries, trackIndexAt, trackStartSec, wrapIndex } from '../features/album/domain/album.js';
import { createAlbumColumn } from '../features/album/presentation/album-column.js';
import { createAlbumCredit } from '../features/album/presentation/album-credit.js';
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
import { createGlobeAttribution } from '../features/globe/presentation/globe-attribution.js';
import { createDateLabel } from '../features/globe/presentation/date-label.js';
import { createGlobeView } from '../features/globe/presentation/globe-view.js';
import { createHalo } from '../features/globe/presentation/halo.js';
import { createSoundEngine } from '../features/music/data/sound-engine.js';
import { FlockComposer } from '../features/music/domain/composers/flock.js';
import { loadBirdTracks } from '../features/tracks/data/bird-track-source.js';
import { sampleFlock } from '../features/tracks/domain/bird-track.js';
import { createRecordSwap } from '../features/turntable/presentation/record-swap.js';
import { createTurntableView } from '../features/turntable/presentation/turntable-view.js';

// Set by showAlbum().
let albumIndex = 0;
let album;
let totalMs;
// What each track of the album plays, by track index, once its birds have loaded: { tracks, lead }, or null for a
// track without birds. Empty until then.
let songs = [];
// The song whose birds the globe shows, and where its flock is now (the globe keeps it in the middle).
let shownSong = null;
let focus = null;

let state = PlaybackState.STOPPED;
let elapsedMs = 0;
let lastFrameTs = null;
let tickFrame = null;
// True while the records change; steps asked for meanwhile add up in pendingSteps.
let swapping = false;
let pendingSteps = 0;

const slot = (id) => document.getElementById(id);

const albumCredit = createAlbumCredit(slot('corner-bottom-right'));
const playHint = createPlayHint(slot('bottom-center'));

const albumColumn = createAlbumColumn(slot('stage'), albums);
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
});
const recordSwap = createRecordSwap({ recordEl: turntable.recordEl, recordGeometry: turntable.recordGeometry, column: albumColumn });
const globe = createGlobeView(turntable.labelSlot);
const globeAttribution = createGlobeAttribution(slot('corner-bottom-right'));
globe.setFocus(() => focus);
const dateLabel = createDateLabel(turntable.labelSlot);
const halo = createHalo(turntable.haloCanvas, () => soundEngine.analyser);
new ResizeObserver(() => halo.place(turntable.labelDisc())).observe(turntable.haloCanvas);
const soundEngine = createSoundEngine({ composer: new FlockComposer() });

const transportControls = createGlassCapsule(slot('corner-bottom-left'));
const playButton = createPlayButton(transportControls, { onToggle: togglePlayback });
createVolumeControl(transportControls, { onChange: soundEngine.setVolume });
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
  globeAttribution.render(GLOBE_THEMES[theme].attribution);
}

function showAlbum(index) {
  albumIndex = index;
  album = albums[albumIndex];
  totalMs = albumDurationSec(album) * 1000;
  albumColumn.setAlbum(albumIndex);
  turntable.setTrackStarts(trackBoundaries(album).slice(1, -1));
  albumCredit.render(album);
  songs = [];
  showSong(null, null);
  loadSongs(album);
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
  elapsedMs = (trackStartSec(album, trackIndex) + trackProgress * album.tracks[trackIndex].durationSec) * 1000;
  globe.glide();
  if (state === PlaybackState.PLAYING) {
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
  cancelAnimationFrame(tickFrame);
  lastFrameTs = null;
  tickFrame = requestAnimationFrame(tick);
}

function render() {
  const progress = elapsedMs / totalMs;
  const trackIndex = trackIndexAt(album, progress);
  turntable.render(state, progress, trackProgressAt(trackIndex));
  albumColumn.render(trackIndex);
  renderSong(trackIndex);
}

// Draws the birds, the date and the flock's place at the clock and, while playing, lets the music follow it.
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
  state = next;
  if (state !== PlaybackState.PLAYING) soundEngine.stop();
  playHint.render(state);
  playButton.render(state);
  render();
}

function tick(ts) {
  if (state !== PlaybackState.PLAYING) return;
  const dtMs = lastFrameTs === null ? 0 : ts - lastFrameTs;
  elapsedMs += dtMs;
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
