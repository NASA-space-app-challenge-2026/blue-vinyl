// Year or day read-out on the wildfire globe, under the date slot.

/** @param {HTMLElement} container */
export function createWildfireOverlay(container) {
  const el = document.createElement('div');
  el.className = 'wildfire-overlay';
  el.setAttribute('aria-hidden', 'true');
  container.append(el);

  /**
   * @param {{ title?: string, detail: string } | null} view `title` (the year) is left out when the date label shows
   *   the date
   */
  function render(view) {
    if (!view) {
      el.replaceChildren();
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const lines = [];
    if (view.title) {
      const title = document.createElement('div');
      title.className = 'wildfire-overlay-title';
      title.textContent = view.title;
      lines.push(title);
    }
    const detail = document.createElement('div');
    detail.className = 'wildfire-overlay-detail';
    detail.textContent = view.detail;
    lines.push(detail);
    el.replaceChildren(...lines);
  }

  return { render };
}
