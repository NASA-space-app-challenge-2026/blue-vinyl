'use strict';

// Composition root: wires the features together.

import { albums } from '../features/album/data/albums.js';
import { albumDurationSec, trackBoundaries, trackIndexAt } from '../features/album/domain/album.js';
import { createAlbumCover } from '../features/album/presentation/album-cover.js';
import { createAlbumCredit } from '../features/album/presentation/album-credit.js';
import { PlaybackState } from '../features/controls/domain/playback-state.js';
import { createPlayHint } from '../features/controls/presentation/play-hint.js';
import { createSettingsMenu } from '../features/controls/presentation/settings-menu.js';
import { GLOBE_THEMES } from '../features/globe/data/globe-themes.js';
import { DEFAULT_GLOBE_THEME, GlobeTheme } from '../features/globe/domain/globe-theme.js';
import { createGlobeAttribution } from '../features/globe/presentation/globe-attribution.js';
import { createGlobeView } from '../features/globe/presentation/globe-view.js';
import { createTurntableView } from '../features/turntable/presentation/turntable-view.js';

// Album switching comes later; show the first album for now.
const albumIndex = 0;
const album = albums[albumIndex];
const totalMs = albumDurationSec(album) * 1000;

let state = PlaybackState.STOPPED;
let elapsedMs = 0;
let lastFrameTs = null;

const slot = (id) => document.getElementById(id);

createAlbumCredit(slot('corner-bottom-right'), album);
const playHint = createPlayHint(slot('bottom-center'));

const cover = createAlbumCover(slot('stage'), { album, index: albumIndex, count: albums.length });
const turntable = createTurntableView(slot('stage'), {
  boundaries: trackBoundaries(album),
  onToggle: togglePlayback,
  onCued: () => {
    if (state !== PlaybackState.CUEING) return;
    setState(PlaybackState.PLAYING);
    lastFrameTs = null;
    requestAnimationFrame(tick);
  },
});
const globe = createGlobeView(turntable.labelSlot);
const globeAttribution = createGlobeAttribution(slot('corner-bottom-right'));

createSettingsMenu(slot('corner-top-right'), {
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

function togglePlayback() {
  setState(state === PlaybackState.STOPPED ? PlaybackState.CUEING : PlaybackState.STOPPED);
}

function render() {
  const progress = elapsedMs / totalMs;
  turntable.render(state, progress);
  cover.render(trackIndexAt(album, progress));
}

function setState(next) {
  state = next;
  playHint.render(state);
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
  requestAnimationFrame(tick);
}

setState(PlaybackState.STOPPED);
