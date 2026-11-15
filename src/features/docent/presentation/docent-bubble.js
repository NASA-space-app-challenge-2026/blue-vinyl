// How long a bubble stays after the docent's last words (ms); how long it takes to pop out of the cat's mouth, to go
// back into it, and to grow or shrink to the next sentence (ms); and how long the next sentence's words wait for it
// before they rise into place, as it appears and as it changes size (ms).
const LINGER_MS = 1600;
const APPEAR_MS = 520;
const LEAVE_MS = 320;
const RESIZE_MS = 340;
const WORDS_DELAY_MS = 120;
const RESIZED_WORDS_DELAY_MS = 180;
// A quick start that eases off; and a slow start that hurries away.
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_IN = 'cubic-bezier(0.55, 0, 0.75, 0.2)';

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
// level with it (deg), the most it turns still drawn flaring into the card (deg; past it, docent.css draws it plain, as
// a flare would stand out past the card's corner), and the room kept at the screen's top and bottom edges (px).
const TAIL_REACH = 22;
const CAT_GAP = 20;
const TAIL_FROM_TOP = 30;
const TAIL_CORNER_ROOM = 24;
const TAIL_MAX_TURN = 55;
const TAIL_FLARE_TURN = 15;
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
  let resizing = null;

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
    const tailTurn = clamp(turn, -TAIL_MAX_TURN, TAIL_MAX_TURN);
    bubble.style.setProperty('--tail-turn', `${tailTurn}deg`);
    bubble.dataset.tail = Math.abs(tailTurn) > TAIL_FLARE_TURN ? 'turned' : 'level';
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

  // The words come in a moment after the card, rising a little into place as they show.
  function riseWords(delay) {
    text.animate(
      [
        { opacity: 0, translate: '0 5px' },
        { opacity: 1, translate: '0 0' },
      ],
      { duration: 300, delay, easing: EASE_OUT, fill: 'backwards' },
    );
  }

  // Stops the card growing or shrinking to the sentence shown, leaving it at that sentence's size.
  function stopResizing() {
    resizing?.cancel();
    resizing = null;
    text.style.width = '';
  }

  // The screen's size changed while a sentence is shown: fit it again where the cat now is.
  addEventListener('resize', () => {
    if (bubble.hidden) return;
    stopResizing();
    fit();
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
    // Back into the cat's mouth: it draws in toward its tail's tip, a little swell first as if taking a breath, and
    // fades as it goes.
    leaving = bubble.animate(
      [
        { opacity: 1, scale: '1' },
        { opacity: 1, scale: '1.03', offset: 0.25 },
        { opacity: 0, scale: '0.2' },
      ],
      { duration: LEAVE_MS, easing: EASE_IN },
    );
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
      // Where the card is now, part way through growing to the sentence before, if it is: what it grows from.
      const from = { width: bubble.offsetWidth, height: bubble.offsetHeight, top: bubble.offsetTop };
      stopResizing();
      text.textContent = line;
      bubble.hidden = false;
      fit();
      if (reduceMotion()) return;
      if (appearing) {
        // Out of the cat's mouth: from a speck at its tail's tip, springing a little past its size and settling.
        bubble.animate(
          [
            { opacity: 0, scale: '0.2' },
            { opacity: 1, scale: '1.06', offset: 0.55 },
            { opacity: 1, scale: '0.985', offset: 0.8 },
            { opacity: 1, scale: '1' },
          ],
          { duration: APPEAR_MS, easing: EASE_OUT },
        );
        riseWords(WORDS_DELAY_MS);
      } else if (changing) {
        // From the last sentence's size to this one's, its words waiting till it has made room for them, and set at
        // the width they will have, so they do not wrap anew as it goes.
        const to = { width: bubble.offsetWidth, height: bubble.offsetHeight, top: bubble.offsetTop };
        if (to.width !== from.width || to.height !== from.height || to.top !== from.top) {
          const box = (size) => ({
            width: `${size.width}px`,
            height: `${size.height}px`,
            top: `${size.top}px`,
            maxWidth: 'none',
          });
          // Its exact width: offsetWidth rounds, and a hair narrower would wrap the last word.
          text.style.width = getComputedStyle(text).width;
          resizing = bubble.animate([box(from), box(to)], { duration: RESIZE_MS, easing: EASE_OUT });
          resizing.onfinish = stopResizing;
        }
        riseWords(resizing ? RESIZED_WORDS_DELAY_MS : 0);
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
