import { ControlIcon, createControlIcon } from './control-icons.js';

/**
 * Left and right chevrons that step to the previous and next album. `render` names the albums they go to.
 *
 * @param {HTMLElement} parent
 * @param {{ onPrevious: () => void, onNext: () => void }} options
 */
export function createAlbumSwitcher(parent, { onPrevious, onNext }) {
  const buttons = [
    { label: 'Previous album', icon: ControlIcon.CHEVRON_LEFT, key: 'ArrowLeft', onClick: onPrevious },
    { label: 'Next album', icon: ControlIcon.CHEVRON_RIGHT, key: 'ArrowRight', onClick: onNext },
  ].map(({ label, icon, key, onClick }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'glass-segment';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-keyshortcuts', key);
    button.append(createControlIcon(icon));
    button.addEventListener('click', onClick);
    return { button, label };
  });
  parent.append(...buttons.map(({ button }) => button));

  /** @param {string} previousTitle @param {string} nextTitle the albums the chevrons go to */
  function render(previousTitle, nextTitle) {
    [previousTitle, nextTitle].forEach((title, i) => {
      buttons[i].button.setAttribute('aria-label', `${buttons[i].label}: ${title}`);
    });
  }

  return { render };
}
