import { ControlIcon, createControlIcon } from './control-icons.js';

/**
 * Left and right chevrons that step to the previous and next album.
 *
 * @param {HTMLElement} parent
 * @param {{ onPrevious: () => void, onNext: () => void }} options
 */
export function createAlbumSwitcher(parent, { onPrevious, onNext }) {
  const buttons = [
    { label: 'Previous album', icon: ControlIcon.CHEVRON_LEFT, onClick: onPrevious },
    { label: 'Next album', icon: ControlIcon.CHEVRON_RIGHT, onClick: onNext },
  ].map(({ label, icon, onClick }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'glass-segment';
    button.setAttribute('aria-label', label);
    button.append(createControlIcon(icon));
    button.addEventListener('click', onClick);
    return button;
  });
  parent.append(...buttons);
}
