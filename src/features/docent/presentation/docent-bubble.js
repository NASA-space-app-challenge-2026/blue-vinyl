/**
 * The docent's words in a speech bubble along the bottom of the screen, said by the cat in the bottom right corner.
 * A screen reader reads them out as they appear or change (aria-live).
 *
 * @param {HTMLElement} parent the screen
 */
export function createDocentBubble(parent) {
  const bubble = document.createElement('aside');
  bubble.className = 'docent-bubble';
  bubble.setAttribute('aria-label', 'Docent');
  bubble.setAttribute('aria-live', 'polite');
  bubble.hidden = true;
  const label = document.createElement('p');
  label.className = 'docent-bubble-label';
  label.textContent = 'Docent';
  const text = document.createElement('p');
  text.className = 'docent-bubble-text';
  bubble.append(label, text);
  parent.append(bubble);

  let on = false;
  let words = '';

  function render() {
    bubble.hidden = !on || !words;
    if (text.textContent === words) return;
    text.textContent = words;
    if (!bubble.hidden) bubble.animate([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 300, easing: 'ease-out' });
  }

  return {
    /** @param {boolean} next whether the docent speaks */
    setOn(next) {
      const opening = next && !on;
      on = next;
      render();
      if (opening && !bubble.hidden) {
        bubble.animate([{ opacity: 0, scale: '0.92' }, { opacity: 1, scale: '1' }], { duration: 250, easing: 'ease-out' });
      }
    },
    /** @param {string | undefined} next what the docent says, or nothing */
    say(next) {
      words = next ?? '';
      render();
    },
  };
}
