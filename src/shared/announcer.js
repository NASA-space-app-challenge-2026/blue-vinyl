// A polite live region: a screen reader reads out what is put in it once it is done speaking, without moving focus.

/**
 * @param {HTMLElement} parent
 * @param {{ settleMs?: number }} [options] a message waits this long and gives way to any newer one, so a run of
 *   quick changes (holding a key, a seek across tracks) is read out once, as it ends
 * @returns {{ say: (text: string) => void }}
 */
export function createAnnouncer(parent, { settleMs = 800 } = {}) {
  const region = document.createElement('div');
  region.className = 'visually-hidden';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  parent.append(region);
  let timer = null;

  return {
    say(text) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // The same words again are read out too: emptied first, the region changes either way.
        region.textContent = '';
        requestAnimationFrame(() => {
          region.textContent = text;
        });
      }, settleMs);
    },
  };
}
