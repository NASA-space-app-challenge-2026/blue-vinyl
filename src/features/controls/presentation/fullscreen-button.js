import { ControlIcon, createControlIcon } from './control-icons.js';

/** Toggles fullscreen for the whole page. Hidden where the browser cannot go fullscreen (e.g. iPhone Safari). */
export function createFullscreenButton(parent) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'glass-segment';
  button.hidden = !document.fullscreenEnabled;
  button.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  });

  function render() {
    const full = document.fullscreenElement !== null;
    button.setAttribute('aria-label', full ? 'Exit fullscreen' : 'Fullscreen');
    button.replaceChildren(createControlIcon(full ? ControlIcon.FULLSCREEN_EXIT : ControlIcon.FULLSCREEN_ENTER));
  }

  document.addEventListener('fullscreenchange', render);
  render();
  parent.append(button);
}
