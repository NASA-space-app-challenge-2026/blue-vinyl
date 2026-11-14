import { PlaybackState } from '../domain/playback-state.js';

/**
 * @param {HTMLElement} parent
 * @param {() => void} onToggle
 */
export function createPlayButton(parent, onToggle) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'play-button';
  button.addEventListener('click', onToggle);
  parent.append(button);

  /** @param {string} state one of PlaybackState */
  function render(state) {
    const stopped = state === PlaybackState.STOPPED;
    button.dataset.state = state;
    button.textContent = stopped ? '▶' : '❚❚';
    button.setAttribute('aria-label', stopped ? 'Play' : 'Pause');
  }

  return { render };
}
