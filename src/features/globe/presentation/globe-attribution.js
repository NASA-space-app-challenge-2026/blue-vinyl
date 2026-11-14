/** @param {HTMLElement} parent */
export function createGlobeAttribution(parent) {
  const attribution = document.createElement('p');
  attribution.className = 'globe-attribution';
  parent.append(attribution);

  /** @param {string} text */
  function render(text) {
    attribution.textContent = text;
  }

  return { render };
}
