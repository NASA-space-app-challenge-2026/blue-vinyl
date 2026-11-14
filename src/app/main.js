'use strict';

// Composition root: wires the features together.

import { albums } from '../features/album/data/albums.js';
import { albumDurationSec, trackBoundaries, trackIndexAt, wrapIndex } from '../features/album/domain/album.js';
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
import { createGlobeView } from '../features/globe/presentation/globe-view.js';
import { createRecordSwap } from '../features/turntable/presentation/record-swap.js';
import { createTurntableView } from '../features/turntable/presentation/turntable-view.js';

// Set by showAlbum().
let albumIndex = 0;
let album;
let totalMs;

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
  onGrab: () => setState(PlaybackState.SCRUBBING),
  onScrub: (progress) => {
    if (progress === null) return;
    elapsedMs = progress * totalMs;
    render();
  },
  onDrop: (progress) => {
    elapsedMs = progress * totalMs;
    startPlaying();
  },
  onLift: () => setState(PlaybackState.STOPPED),
});
const recordSwap = createRecordSwap({ recordEl: turntable.recordEl, recordGeometry: turntable.recordGeometry, column: albumColumn });
const globe = createGlobeView(turntable.labelSlot);
const globeAttribution = createGlobeAttribution(slot('corner-bottom-right'));

const transportControls = createGlassCapsule(slot('corner-bottom-left'));
const playButton = createPlayButton(transportControls, { onToggle: togglePlayback });
createVolumeControl(transportControls);
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

function togglePlayback() {
  if (swapping) return;
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
  turntable.render(state, progress);
  albumColumn.render(trackIndexAt(album, progress));
}

function setState(next) {
  state = next;
  playHint.render(state);
  playButton.render(state);
  render();
}

function tick(ts) {
  if (state !== PlaybackState.PLAYING) return;
  if (lastFrameTs !== null) elapsedMs += ts - lastFrameTs;
  lastFrameTs = ts;
  if (elapsedMs >= totalMs) {
    elapsedMs = 0;
    setState(PlaybackState.STOPPED);
    return;
  }
  render();
  tickFrame = requestAnimationFrame(tick);
}

showAlbum(albumIndex);
setState(PlaybackState.STOPPED);
