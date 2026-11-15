// How long a bubble stays after the docent's last words (ms), and how long it takes to go (ms).
const LINGER_MS = 1600;
const LEAVE_MS = 280;

// Room kept between the bubble and the globe (px), and how a long sentence is fitted beside it: made narrower a step at
// a time down to MIN_WIDTH (so it reaches less far toward the globe), else let down from the cat's mouth a step at a
// time (below the globe), else its words set smaller, down to the last size.
const GLOBE_CLEARANCE = 8;
const WIDTH_STEP = 40;
const MIN_WIDTH = 160;
const DROP_STEP = 8;
const SMALLER_FONTS = Object.freeze([13, 12, 11]);

// How far the tail reaches out past the card's side toward the cat (px, as drawn in docent.css), the room left between
// its tip and the cat's cheek (px), how far below the card's top it sits when the card can hang from it, how near the
// card's corners it may come, the most it turns from straight out to keep pointing at the cat when the card cannot be
// level with it (deg), and the room kept at the screen's top and bottom edges (px).
const TAIL_REACH = 22;
const CAT_GAP = 10;
const TAIL_FROM_TOP = 30;
const TAIL_CORNER_ROOM = 24;
const TAIL_MAX_TURN = 55;
const SCREEN_EDGE = 16;

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The cat's speech bubble: it shows the docent's words a sentence at a time, each whole as it is begun, and goes once
 * the docent stops speaking. It hangs beside the cat from the height of its mouth, its tail pointing at the cat's
 * cheek: its top stays there and a longer sentence reaches further down (up from the screen's bottom, if it would run
 * past it). Where the bubble cannot be level with the cat, its tail turns toward it.
 *
 * A long sentence is fitted so the bubble keeps clear of the globe: the bubble is made narrower, so it reaches less far
 * toward the globe, else let down below the globe, and if that is not enough its words are set smaller.
 *
 * It is not a live region: the docent's voice already says these words aloud, and a screen reader reading them too
 * would talk over it.
 *
 * @param {HTMLElement} parent the screen
 * @param {{
 *   avoid?: () => { x: number, y: number, r: number } | null,
 *   speaker?: () => { x: number, y: number } | null,
 * }} [options]
 *   avoid: the globe's disc in the screen's layout pixels (its centre and radius), for the bubble to keep clear of;
 *   speaker: the cat's cheek in the same pixels, for the tail to point at (null while the cat is not drawn, when the
 *   bubble stays where docent.css puts it)
 */
export function createDocentBubble(parent, { avoid, speaker } = {}) {
  const bubble = document.createElement('aside');
  bubble.className = 'docent-bubble';
  bubble.setAttribute('aria-label', 'Docent');
  bubble.hidden = true;
  const text = document.createElement('p');
  text.className = 'docent-bubble-text';
  bubble.append(text);
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

  const clamp = (value, low, high) => Math.min(Math.max(value, low), high);

  // Puts the bubble where its tail points at the cat (see the class comment), for its size as it is now, `drop` px
  // lower than level with the cat's mouth.
  function aim(drop = 0) {
    const cheek = speaker?.();
    if (!cheek) return;
    const height = bubble.offsetHeight;
    const lowest = parent.clientHeight - SCREEN_EDGE - height;
    const top = Math.max(SCREEN_EDGE, Math.min(cheek.y - TAIL_FROM_TOP + drop, lowest));
    const edge = cheek.x - CAT_GAP - TAIL_REACH;
    bubble.style.top = `${top}px`;
    bubble.style.bottom = 'auto';
    bubble.style.right = `${parent.clientWidth - edge}px`;
    const room = Math.min(TAIL_CORNER_ROOM, height / 2);
    const tailY = clamp(cheek.y - top, room, height - room);
    bubble.style.setProperty('--tail-y', `${tailY}px`);
    // Turned from straight out toward the cheek, round where it leaves the card.
    const turn = (Math.atan2(cheek.y - (top + tailY), cheek.x - edge) * 180) / Math.PI;
    bubble.style.setProperty('--tail-turn', `${clamp(turn, -TAIL_MAX_TURN, TAIL_MAX_TURN)}deg`);
  }

  // Fits the sentence shown so the bubble keeps clear of the globe (see the class comment), aimed at the cat at each
  // size tried.
  function fit() {
    bubble.style.maxWidth = '';
    text.style.fontSize = '';
    aim();
    if (!overlapsGlobe()) return;
    const natural = bubble.offsetWidth;
    const tryWidth = (width) => {
      bubble.style.maxWidth = `${width}px`;
      aim();
      return !overlapsGlobe();
    };
    for (let width = natural - WIDTH_STEP; width >= MIN_WIDTH; width -= WIDTH_STEP) {
      if (tryWidth(width)) return;
    }
    bubble.style.maxWidth = '';
    // Let down from the cat's mouth, a step at a time, till it is below the globe or at the screen's bottom.
    let drop = 0;
    for (let top = bubble.offsetTop; ; ) {
      drop += DROP_STEP;
      aim(drop);
      if (!overlapsGlobe()) return;
      if (bubble.offsetTop === top) break;
      top = bubble.offsetTop;
    }
    // Nothing else cleared it: set the words smaller.
    for (const size of SMALLER_FONTS) {
      text.style.fontSize = `${size}px`;
      aim(drop);
      if (!overlapsGlobe()) return;
    }
  }

  // The screen's size changed while a sentence is shown: fit it again where the cat now is.
  addEventListener('resize', () => {
    if (!bubble.hidden) fit();
  });

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
