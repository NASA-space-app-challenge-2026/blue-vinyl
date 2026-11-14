/**
 * Creates the glass capsule that groups controls as segments.
 *
 * @param {HTMLElement} parent
 * @returns {HTMLElement} the capsule, to append segments to
 */
export function createGlassCapsule(parent) {
  const capsule = document.createElement('div');
  capsule.className = 'glass-capsule';
  parent.append(capsule);
  return capsule;
}
