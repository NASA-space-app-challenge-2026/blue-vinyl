// How long a bubble stays after the docent's last words (ms), and how long it takes to go (ms).
const LINGER_MS = 1600;
const LEAVE_MS = 280;

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The cat's speech bubble in the bottom right corner: it shows the docent's words a caption at a time, as they are
 * said, each streaming in a word after another, and goes once the docent stops speaking.
 *
 * It is not a live region: the docent's voice already says these words aloud, and a screen reader reading them too
 * would talk over it.
 *
 * @param {HTMLElement} parent the screen
 */
export function createDocentBubble(parent) {
  const bubble = document.createElement('aside');
  bubble.className = 'docent-bubble';
  bubble.setAttribute('aria-label', 'Docent');
  bubble.hidden = true;
  const label = document.createElement('span');
  label.className = 'docent-bubble-label';
  label.textContent = 'Docent';
  const text = document.createElement('p');
  text.className = 'docent-bubble-text';
  bubble.append(label, text);
  parent.append(bubble);

  let on = false;
  let lingering = null;
  let leaving = null;

  function stopLeaving() {
    clearTimeout(lingering);
    lingering = null;
    leaving?.cancel();
    leaving = null;
  }

  function hide() {
    stopLeaving();
    if (bubble.hidden) return;
    if (reduceMotion()) {
      bubble.hidden = true;
      return;
    }
    leaving = bubble.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '0.92' }], {
      duration: LEAVE_MS,
      easing: 'ease-in',
    });
    leaving.onfinish = () => {
      bubble.hidden = true;
      leaving = null;
    };
  }

  return {
    /** @param {boolean} next whether the docent is on; off, the bubble goes at once */
    setOn(next) {
      on = next;
      if (!on) {
        stopLeaving();
        bubble.hidden = true;
      }
    },
    /**
     * Shows `line`, its words streaming in one after another, in place of the caption before.
     *
     * @param {string} line
     */
    show(line) {
      if (!on) return;
      stopLeaving();
      const words = line.split(/\s+/);
      text.replaceChildren(
        ...words.flatMap((word, i) => {
          const span = document.createElement('span');
          span.className = 'docent-word';
          span.style.setProperty('--i', String(i));
          span.textContent = word;
          return i ? [' ', span] : [span];
        }),
      );
      if (bubble.hidden) {
        bubble.hidden = false;
        if (!reduceMotion()) {
          bubble.animate(
            [
              { opacity: 0, scale: '0.6' },
              { opacity: 1, scale: '1.04', offset: 0.7 },
              { opacity: 1, scale: '1' },
            ],
            { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
          );
        }
      }
    },
    /** Goes a moment after the docent's last words. */
    hideSoon() {
      stopLeaving();
      lingering = setTimeout(hide, LINGER_MS);
    },
    /** Goes now. */
    hide,
  };
}
