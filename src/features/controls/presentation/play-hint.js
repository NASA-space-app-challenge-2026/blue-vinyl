import { PlaybackState } from '../domain/playback-state.js';

/** @param {HTMLElement} parent */
export function createPlayHint(parent) {
  const hint = document.createElement('p');
  hint.className = 'play-hint';
  parent.append(hint);

  /** @param {string} state one of PlaybackState */
  function render(state) {
    hint.textContent = state === PlaybackState.STOPPED ? 'Press Space to play' : 'Press Space to pause';
  }

  return { render };
}
