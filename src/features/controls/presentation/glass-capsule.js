import { createRovingFocus } from '../../../shared/roving-focus.js';

/**
 * Creates the glass capsule that groups controls as segments. It is a labelled toolbar taking one Tab stop; the left
 * and right arrow keys move between its segments.
 *
 * @param {HTMLElement} parent
 * @param {{ label: string }} options  the group's name read out by a screen reader, e.g. "Playback"
 * @returns {HTMLElement} the capsule, to append segments to
 */
export function createGlassCapsule(parent, { label }) {
  const capsule = document.createElement('div');
  capsule.className = 'glass-capsule';
  capsule.setAttribute('role', 'toolbar');
  capsule.setAttribute('aria-label', label);
  createRovingFocus(capsule, { selector: '.glass-segment' });
  parent.append(capsule);
  return capsule;
}
