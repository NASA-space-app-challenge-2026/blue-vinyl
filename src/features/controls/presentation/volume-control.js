import { ControlIcon, createControlIcon } from './control-icons.js';

const MAX_VOLUME = 100;
const DEFAULT_VOLUME = 80;
/** How far one press of the up or down arrow key moves the volume. */
const VOLUME_STEP = 10;
/** Below this the speaker shows one wave instead of two. */
const LOW_VOLUME = 50;
/** Idle time after which the expanded control folds back into a single button. */
const COLLAPSE_DELAY_MS = 2500;

/**
 * Speaker button that expands into a volume slider, like a video player.
 * The first click expands it; once expanded, the speaker toggles mute.
 * It folds back after COLLAPSE_DELAY_MS without the pointer or keyboard focus inside.
 * `step(direction)` turns it up (1) or down (-1) by VOLUME_STEP, opening it for a moment to show the level.
 *
 * @param {HTMLElement} parent
 * @param {{ onChange?: (level: number) => void }} [options] `onChange` gets the level heard, 0 (silent or muted) to 1
 */
export function createVolumeControl(parent, { onChange } = {}) {
  let volume = DEFAULT_VOLUME;
  let muted = false;
  let open = false;
  /** Only a mouse hovers; on touch screens :hover sticks after a tap and would keep it open. */
  let mouseInside = false;
  let collapseTimer = null;

  const root = document.createElement('div');
  root.className = 'volume';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'glass-segment';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'volume-slider';
  slider.min = '0';
  slider.max = String(MAX_VOLUME);
  slider.setAttribute('aria-label', 'Volume');

  function speakerIcon() {
    if (muted) return ControlIcon.VOLUME_MUTED;
    return volume < LOW_VOLUME ? ControlIcon.VOLUME_LOW : ControlIcon.VOLUME_HIGH;
  }

  function render() {
    const shown = muted ? 0 : volume;
    onChange?.(shown / MAX_VOLUME);
    root.classList.toggle('is-open', open);
    slider.tabIndex = open ? 0 : -1;
    slider.value = String(shown);
    slider.style.setProperty('--fill', `${(shown / MAX_VOLUME) * 100}%`);
    toggle.setAttribute('aria-label', open ? (muted ? 'Unmute' : 'Mute') : 'Volume');
    toggle.replaceChildren(createControlIcon(speakerIcon()));
  }

  function scheduleCollapse() {
    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => {
      // Keyboard focus keeps it open; focus left behind by a mouse click does not.
      if (mouseInside || root.querySelector(':focus-visible')) return;
      open = false;
      render();
    }, COLLAPSE_DELAY_MS);
  }

  toggle.addEventListener('click', () => {
    if (!open) {
      open = true;
    } else {
      muted = !muted;
      // Unmuting at zero would stay silent, so bring the level back up.
      if (!muted && volume === 0) volume = DEFAULT_VOLUME;
    }
    render();
    scheduleCollapse();
  });

  slider.addEventListener('input', () => {
    volume = Number(slider.value);
    muted = volume === 0;
    render();
    scheduleCollapse();
  });

  root.addEventListener('pointerenter', (event) => {
    mouseInside = event.pointerType === 'mouse';
  });
  root.addEventListener('pointerleave', () => {
    mouseInside = false;
    scheduleCollapse();
  });
  root.addEventListener('focusout', scheduleCollapse);

  /** @param {number} direction 1 louder, -1 quieter */
  function step(direction) {
    const from = muted ? 0 : volume;
    volume = Math.min(MAX_VOLUME, Math.max(0, from + direction * VOLUME_STEP));
    muted = volume === 0;
    open = true;
    render();
    scheduleCollapse();
  }

  root.append(toggle, slider);
  parent.append(root);
  render();
  return { step };
}
