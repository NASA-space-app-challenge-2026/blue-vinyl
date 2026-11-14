import { PlaybackState } from '../domain/playback-state.js';
import { ControlIcon, createControlIcon } from './control-icons.js';

/**
 * @param {HTMLElement} parent
 * @param {{ onToggle: () => void }} options
 */
export function createPlayButton(parent, { onToggle }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'glass-segment';
  button.addEventListener('click', onToggle);
  parent.append(button);

  /** @param {string} state one of PlaybackState */
  function render(state) {
    const stopped = state === PlaybackState.STOPPED;
    button.setAttribute('aria-label', stopped ? 'Play' : 'Pause');
    button.replaceChildren(createControlIcon(stopped ? ControlIcon.PLAY : ControlIcon.PAUSE));
  }

  return { render };
}
