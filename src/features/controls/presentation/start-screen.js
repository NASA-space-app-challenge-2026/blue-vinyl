// The title screen over everything at first. Browsers let audio start only from a tap, a click or a key, and a drag
// is none of them on a phone, so a first drag of the tonearm would play silently; one tap anywhere here unlocks the
// sound before anything can be played.

// How long the screen takes to fade away, and the stage beneath to come up.
const LEAVE_MS = 700;
const ENTER_MS = 900;
const ENTER_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * @param {HTMLElement} parent where the screen goes, over everything in it
 * @param {{ stage: HTMLElement, onStart: () => void }} options
 *   stage: what comes up as the screen goes; onStart: called within the tap, so it may start audio
 * @returns {{ isOpen: () => boolean }}
 */
export function createStartScreen(parent, { stage, onStart }) {
  const screen = document.createElement('button');
  screen.type = 'button';
  screen.className = 'start-screen';
  screen.append(
    text('h1', 'start-screen-title', 'Blue Vinyl'),
    text('p', 'start-screen-line', 'Listen to the sound of the Pale Blue Dot.'),
    text('p', 'start-screen-cue', 'Tap to start'),
  );
  parent.append(screen);
  stage.classList.add('before-start');
  screen.focus();

  let open = true;
  screen.addEventListener('click', () => {
    if (!open) return;
    open = false;
    onStart();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stage.classList.remove('before-start');
    stage.animate(
      [{ opacity: 0, translate: '0 4vh', scale: '0.96' }, { opacity: 1, translate: '0 0', scale: '1' }],
      { duration: reduce ? 0 : ENTER_MS, delay: reduce ? 0 : LEAVE_MS / 3, easing: ENTER_EASING, fill: 'backwards' },
    );
    screen
      .animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '1.04' }], {
        duration: reduce ? 0 : LEAVE_MS,
        easing: 'ease-in',
        fill: 'forwards',
      })
      .finished.then(() => screen.remove());
  });

  return { isOpen: () => open };
}

function text(tag, className, content) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
}
