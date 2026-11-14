'use strict';

// Composition root: wires the features together.

import { albums } from '../features/album/data/albums.js';
import { albumDurationSec, trackBoundaries } from '../features/album/domain/album.js';
import { createAlbumCover } from '../features/album/presentation/album-cover.js';
import { PlaybackState } from '../features/controls/domain/playback-state.js';
import { createPlayButton } from '../features/controls/presentation/play-button.js';
import { createGlobePlaceholder } from '../features/globe/presentation/globe-placeholder.js';
import { TURNTABLE } from '../features/turntable/domain/geometry.js';
import { createTurntableView } from '../features/turntable/presentation/turntable-view.js';

// Album switching comes later; show the first album for now.
const album = albums[0];
const totalMs = albumDurationSec(album) * 1000;

let state = PlaybackState.STOPPED;
let elapsedMs = 0;
let lastFrameTs = null;

const deck = document.getElementById('deck');
const controls = document.getElementById('controls');

createAlbumCover(deck, album);
const turntable = createTurntableView(deck, {
  boundaries: trackBoundaries(album),
  onCued: () => {
    if (state !== PlaybackState.CUEING) return;
    setState(PlaybackState.PLAYING);
    lastFrameTs = null;
    requestAnimationFrame(tick);
  },
});
turntable.labelSlot.append(createGlobePlaceholder(TURNTABLE.labelRadius));

const playButton = createPlayButton(controls, () => {
  setState(state === PlaybackState.STOPPED ? PlaybackState.CUEING : PlaybackState.STOPPED);
});

function setState(next) {
  state = next;
  turntable.render(state, elapsedMs / totalMs);
  playButton.render(state);
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
  turntable.render(state, elapsedMs / totalMs);
  requestAnimationFrame(tick);
}

setState(PlaybackState.STOPPED);
