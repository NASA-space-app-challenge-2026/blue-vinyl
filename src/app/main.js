'use strict';

// Composition root: wires the features together.

import { albums } from '../features/album/data/albums.js';
import { albumDurationSec, trackBoundaries, trackIndexAt } from '../features/album/domain/album.js';
import { createAlbumCover } from '../features/album/presentation/album-cover.js';
import { createAlbumCredit } from '../features/album/presentation/album-credit.js';
import { Language } from '../features/controls/domain/language.js';
import { PlaybackState } from '../features/controls/domain/playback-state.js';
import { createAlbumNav, createLanguageToggle, createPlayHint, createViewOptions } from '../features/controls/presentation/chrome.js';
import { createGlobePlaceholder } from '../features/globe/presentation/globe-placeholder.js';
import { TURNTABLE } from '../features/turntable/domain/geometry.js';
import { createTurntableView } from '../features/turntable/presentation/turntable-view.js';

// Album switching comes later; show the first album for now.
const albumIndex = 0;
const album = albums[albumIndex];
const totalMs = albumDurationSec(album) * 1000;

let state = PlaybackState.STOPPED;
let elapsedMs = 0;
let lastFrameTs = null;

const slot = (id) => document.getElementById(id);

createLanguageToggle(slot('corner-top-left'), Language.EN);
createViewOptions(slot('corner-top-right'));
createAlbumNav(slot('corner-bottom-left'));
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
turntable.labelSlot.append(createGlobePlaceholder(TURNTABLE.labelRadius));

document.addEventListener('keydown', (event) => {
  // A focused button already reacts to Space on its own.
  if (event.code !== 'Space' || event.target instanceof HTMLButtonElement) return;
  event.preventDefault();
  togglePlayback();
});

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
