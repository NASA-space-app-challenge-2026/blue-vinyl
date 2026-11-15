// How long a bubble stays after the docent's last words (ms), and how long it takes to go (ms).
const LINGER_MS = 1600;
const LEAVE_MS = 280;

// Room kept between the bubble and the globe (px), and how a long sentence is fitted beside it: widened a step at a
// time up to MAX_WIDTH (but never over the left FREE_SHARE of the screen), then set smaller, down to the last size.
const GLOBE_CLEARANCE = 8;
const WIDEN_STEP = 40;
const MAX_WIDTH = 640;
const FREE_SHARE = 0.3;
const SMALLER_FONTS = Object.freeze([13, 12, 11]);

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The cat's speech bubble in the bottom right corner: it shows the docent's words a sentence at a time, each whole as
 * it is begun, and goes once the docent stops speaking.
 *
 * A long sentence is fitted so the bubble keeps clear of the globe: the bubble is widened, so it takes fewer lines,
 * and if that is not enough its words are set smaller.
 *
 * It is not a live region: the docent's voice already says these words aloud, and a screen reader reading them too
 * would talk over it.
 *
 * @param {HTMLElement} parent the screen
 * @param {{ avoid?: () => { x: number, y: number, r: number } | null }} [options]
 *   avoid: the globe's disc in the screen's layout pixels (its centre and radius), for the bubble to keep clear of
 */
export function createDocentBubble(parent, { avoid } = {}) {
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

  // Whether the bubble, as laid out (its offsets: the screen's pixels, before any animation's transform), touches the
  // globe's disc.
  function overlapsGlobe() {
    const disc = avoid?.();
    if (!disc) return false;
    const left = bubble.offsetLeft;
    const top = bubble.offsetTop;
    const x = Math.min(Math.max(disc.x, left), left + bubble.offsetWidth);
    const y = Math.min(Math.max(disc.y, top), top + bubble.offsetHeight);
    return (x - disc.x) ** 2 + (y - disc.y) ** 2 < (disc.r + GLOBE_CLEARANCE) ** 2;
  }

  // Fits the sentence shown so the bubble keeps clear of the globe (see the class comment).
  function fit() {
    bubble.style.maxWidth = '';
    text.style.fontSize = '';
    if (!overlapsGlobe()) return;
    const right = bubble.offsetLeft + bubble.offsetWidth;
    const widest = Math.min(MAX_WIDTH, right - parent.clientWidth * FREE_SHARE);
    for (let width = bubble.offsetWidth + WIDEN_STEP; width <= widest; width += WIDEN_STEP) {
      bubble.style.maxWidth = `${width}px`;
      if (!overlapsGlobe()) return;
    }
    // Widening did not clear it (on a phone, where the bubble sits beside the globe rather than below it): keep its
    // width, and set the words smaller.
    bubble.style.maxWidth = '';
    for (const size of SMALLER_FONTS) {
      text.style.fontSize = `${size}px`;
      if (!overlapsGlobe()) return;
    }
  }

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
     * Shows `line` whole, in place of the sentence before, which it fades in over.
     *
     * @param {string} line
     */
    show(line) {
      if (!on) return;
      stopLeaving();
      const changing = !bubble.hidden && text.textContent !== line;
      const appearing = bubble.hidden;
      text.textContent = line;
      bubble.hidden = false;
      fit();
      if (changing && !reduceMotion()) {
        text.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      }
      if (appearing && !reduceMotion()) {
        bubble.animate(
          [
            { opacity: 0, scale: '0.6' },
            { opacity: 1, scale: '1.04', offset: 0.7 },
            { opacity: 1, scale: '1' },
          ],
          { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
        );
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
