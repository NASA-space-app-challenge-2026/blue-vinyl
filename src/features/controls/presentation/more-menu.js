import { ControlIcon, createControlIcon } from './control-icons.js';

/**
 * A "more" button (three dots) that drops down a menu of items. Escape or a click outside closes it; up and down move
 * between the items.
 *
 * @param {HTMLElement} parent
 * @param {{ items: { label: string, onSelect: () => void }[] }} options
 */
export function createMoreMenu(parent, { items }) {
  const root = document.createElement('div');
  root.className = 'more';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'glass-segment more-toggle';
  toggle.setAttribute('aria-label', 'More');
  toggle.setAttribute('aria-haspopup', 'menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'more-menu');
  toggle.append(createControlIcon(ControlIcon.MORE));

  const menu = document.createElement('div');
  menu.id = 'more-menu';
  menu.className = 'more-menu';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;

  const buttons = items.map(({ label, onSelect }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'more-item';
    button.setAttribute('role', 'menuitem');
    button.tabIndex = -1;
    button.textContent = label;
    button.addEventListener('click', () => {
      // Focus the toggle first, so a dialog the item opens gives focus back to it when it closes.
      setOpen(false, { focusToggle: true });
      onSelect();
    });
    return button;
  });
  menu.append(...buttons);

  function isOpen() {
    return !menu.hidden;
  }

  /** @param {boolean} open @param {{ focusToggle?: boolean }} [options] */
  function setOpen(open, { focusToggle = false } = {}) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) buttons[0]?.focus();
    else if (focusToggle) toggle.focus();
  }

  function moveFocus(step) {
    const index = buttons.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
    buttons[(index + step + buttons.length) % buttons.length].focus();
  }

  toggle.addEventListener('click', () => setOpen(!isOpen()));
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') moveFocus(1);
    else if (event.key === 'ArrowUp') moveFocus(-1);
    else if (event.key === 'Home') buttons[0].focus();
    else if (event.key === 'End') buttons[buttons.length - 1].focus();
    else if (event.key === 'Tab') setOpen(false);
    else return;
    if (event.key !== 'Tab') event.preventDefault();
  });
  document.addEventListener('click', (event) => {
    if (isOpen() && !root.contains(/** @type {Node} */ (event.target))) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) setOpen(false, { focusToggle: true });
  });

  root.append(toggle, menu);
  parent.append(root);
}
