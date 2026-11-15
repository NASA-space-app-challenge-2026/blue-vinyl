// The onboarding over everything at first: what Blue Vinyl is, beside the Pale Blue Dot, then why earphones bring out
// its spatial audio, with a preview that circles the head. Browsers let audio start only from a tap, a click or a key,
// and a drag is none of them on a phone, so a first drag of the tonearm would play silently; the buttons here are
// tapped before anything can be played, and the last one (or Skip) unlocks the sound as the player comes up.

import { svg } from '../../../shared/svg.js';

// How long the onboarding takes to fade away, and the stage beneath to come up.
const LEAVE_MS = 700;
const ENTER_MS = 900;
const ENTER_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
// A step slides this far in from the side it comes from, over this long.
const STEP_SHIFT = '3cqw';
const STEP_MS = 480;
// The earphones' picture: a head seen from above in a 200 × 200 box, facing up, and the dot's circle round it.
const HEAD = Object.freeze({ cx: 100, cy: 100, orbit: 74 });
// The faint dots trailing the circling one, in degrees behind it.
const TRAIL_DEG = Object.freeze([10, 20, 30, 42, 56]);

/**
 * @param {HTMLElement} parent where the onboarding goes, over everything in it
 * @param {{
 *   content: import('../domain/info.js').OnboardingContent,
 *   stage: HTMLElement,
 *   preview: { turnSec: number, play: () => Promise<void>, stop: () => void },
 *   onStart: () => void,
 * }} options
 *   content: what it says; stage: what comes up as it goes; preview: the spatial audio preview; onStart: called within
 *   the tap that closes it, so it may start audio
 * @returns {{ isOpen: () => boolean }}
 */
export function createOnboarding(parent, { content, stage, preview, onStart }) {
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = content.steps.length;

  const root = el('div', 'onboarding');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');

  const skip = button('onboarding-skip', content.skip);
  const top = el('div', 'onboarding-top', [skip]);

  let orbit = null;
  // The step with the preview, which plays on its own once as the step comes up, and the function that plays it.
  let previewStep = -1;
  let playPreview = () => {};
  const steps = content.steps.map((step, index) => {
    const section = el('section', 'onboarding-step');
    section.setAttribute('aria-label', `Step ${index + 1} of ${count}`);
    const heading = el('h2', 'onboarding-heading', [step.heading]);
    heading.id = `onboarding-heading-${index}`;
    const text = el('div', 'onboarding-text');
    if (index === 0) text.append(el('p', 'onboarding-logo', ['Blue Vinyl']));
    if (step.eyebrow) text.append(el('p', 'onboarding-eyebrow', [step.eyebrow]));
    text.append(heading, ...step.body.map((body) => el('p', 'onboarding-body', [body])));
    if (step.note) text.append(el('p', 'onboarding-note', [step.note]));

    let visual;
    if (step.visual === 'earphones') {
      const picture = earphones();
      orbit = picture.orbit;
      visual = picture.node;
      previewStep = index;
      text.append(previewButton());
    } else {
      visual = paleBlueDot();
    }
    section.append(el('div', 'onboarding-visual', [visual]), text);
    return section;
  });

  const back = button('onboarding-back', content.back);
  const next = button('onboarding-next', content.next);
  const nav = el('div', 'onboarding-nav', [back, next]);

  root.append(sky(), top, el('div', 'onboarding-steps', steps), nav);
  parent.append(root);

  // Everything else on the screen is out of reach while it is up: no focus, no screen reader, no taps.
  const covered = [...parent.children].filter((child) => child !== root && !child.inert);
  for (const child of covered) child.inert = true;
  stage.classList.add('before-start');

  // The dot circles the head once, in time with the preview, and rests where it began.
  let spin = null;
  function startOrbit() {
    spin?.cancel();
    spin = orbit.animate([{ transform: 'rotate(0turn)' }, { transform: 'rotate(1turn)' }], {
      duration: preview.turnSec * 1000,
    });
  }

  let current = -1;
  let open = true;

  function show(index) {
    const from = current;
    current = Math.max(0, Math.min(count - 1, index));
    if (from === current) return;
    steps.forEach((section, i) => {
      const active = i === current;
      section.hidden = !active;
      section.inert = !active;
    });
    root.setAttribute('aria-labelledby', `onboarding-heading-${current}`);
    const last = current === count - 1;
    back.classList.toggle('is-hidden', current === 0);
    back.disabled = current === 0;
    skip.classList.toggle('is-hidden', last);
    skip.disabled = last;
    next.textContent = last ? content.start : content.next;
    next.classList.toggle('is-start', last);
    if (from >= 0 && !reduce()) {
      const shift = current > from ? STEP_SHIFT : `-${STEP_SHIFT}`;
      steps[current].animate([{ opacity: 0, translate: `${shift} 0` }, { opacity: 1, translate: '0 0' }], {
        duration: STEP_MS,
        easing: ENTER_EASING,
      });
    }
    next.focus();
    // Coming to the preview's step plays it once, from the tap or key that came here; leaving it silences it.
    if (current === previewStep) playPreview();
    else if (from === previewStep) preview.stop();
  }

  function finish() {
    if (!open) return;
    open = false;
    preview.stop();
    onStart();
    for (const child of covered) child.inert = false;
    const instant = reduce();
    stage.classList.remove('before-start');
    stage.animate(
      [{ opacity: 0, translate: '0 4vh', scale: '0.96' }, { opacity: 1, translate: '0 0', scale: '1' }],
      { duration: instant ? 0 : ENTER_MS, delay: instant ? 0 : LEAVE_MS / 3, easing: ENTER_EASING, fill: 'backwards' },
    );
    root
      .animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '1.04' }], {
        duration: instant ? 0 : LEAVE_MS,
        easing: 'ease-in',
        fill: 'forwards',
      })
      .finished.then(() => {
        spin?.cancel();
        root.remove();
      });
  }

  next.addEventListener('click', () => (current === count - 1 ? finish() : show(current + 1)));
  back.addEventListener('click', () => show(current - 1));
  skip.addEventListener('click', finish);
  // The arrows step through; Enter and Space press the focused button.
  root.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' && current < count - 1) show(current + 1);
    else if (event.key === 'ArrowLeft') show(current - 1);
    else return;
    event.preventDefault();
  });

  show(0);
  return { isOpen: () => open };

  // Plays the preview, or stops it while it plays.
  function previewButton() {
    const label = el('span', '', [content.preview]);
    const icon = el('span', 'onboarding-preview-icon', [headphonesIcon(), stopIcon()]);
    const toggle = button('onboarding-preview', '');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.append(icon, label);
    let playing = false;
    function set(on) {
      playing = on;
      toggle.classList.toggle('is-playing', on);
      toggle.setAttribute('aria-pressed', String(on));
      label.textContent = on ? content.previewStop : content.preview;
    }
    function begin() {
      if (playing) return;
      set(true);
      startOrbit();
      preview.play().then(() => {
        set(false);
        if (reduce()) spin?.cancel();
      });
    }
    playPreview = begin;
    toggle.addEventListener('click', () => (playing ? preview.stop() : begin()));
    return toggle;
  }
}

// The band of scattered sunlight across the whole sky, as across Voyager 1's photo, and a scatter of faint grain.
function sky() {
  const node = el('div', 'onboarding-sky', [el('div', 'onboarding-beam'), el('div', 'onboarding-grain')]);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

// Earth as Voyager 1 saw it: a speck of pale blue in a ray of light, marked like a place on a map.
function paleBlueDot() {
  const node = el('div', 'pale-blue-dot', [
    el('div', 'pale-blue-dot-ray'),
    el('div', 'pale-blue-dot-earth'),
    el('div', 'pale-blue-dot-mark', [el('span', 'pale-blue-dot-label', ['You are here'])]),
  ]);
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', 'A pale blue dot, Earth, in a ray of sunlight in dark space');
  return node;
}

// A head with headphones seen from above, facing up: shoulders behind, the nose's tip ahead, hair with a sheen, and
// the headphones' band across the top of the head between two cushioned cups. A pale blue dot circles it with a
// fading trail.
function earphones() {
  const { cx, cy, orbit: o } = HEAD;
  const trail = TRAIL_DEG.map((deg, i) => {
    const a = (-deg * Math.PI) / 180;
    return svg('circle', {
      cx: cx + o * Math.sin(a),
      cy: cy - o * Math.cos(a),
      r: 4.2 - i * 0.6,
      class: 'earphones-trail',
      style: `opacity: ${0.5 - i * 0.09}`,
    });
  });
  const orbit = svg('g', { class: 'earphones-orbit' }, [
    ...trail,
    svg('circle', { cx, cy: cy - o, r: 11, class: 'earphones-glow' }),
    svg('circle', { cx, cy: cy - o, r: 5, class: 'earphones-dot' }),
  ]);
  const cup = (x) => svg('g', { class: 'earphones-cup' }, [
    svg('rect', { x, y: cy - 13, width: 11, height: 26, rx: 5.5, class: 'earphones-cup-shell' }),
    svg('rect', { x: x + (x < cx ? 6 : 0), y: cy - 10, width: 5, height: 20, rx: 2.5, class: 'earphones-cup-pad' }),
  ]);
  const node = svg('svg', { viewBox: '0 0 200 200', class: 'earphones', role: 'img' }, [
    svg('title', {}, []),
    svg('defs', {}, [
      svg('radialGradient', { id: 'earphones-glow' }, [
        svg('stop', { offset: '0', 'stop-color': '#bfe0ff', 'stop-opacity': '0.9' }),
        svg('stop', { offset: '1', 'stop-color': '#bfe0ff', 'stop-opacity': '0' }),
      ]),
      // Hair lit from the upper left, as the record's sheen is.
      svg('radialGradient', { id: 'earphones-hair', cx: '0.38', cy: '0.32', r: '0.75' }, [
        svg('stop', { offset: '0', 'stop-color': '#5a4a40' }),
        svg('stop', { offset: '0.6', 'stop-color': '#3a2e28' }),
        svg('stop', { offset: '1', 'stop-color': '#231b17' }),
      ]),
      svg('linearGradient', { id: 'earphones-shoulders', x1: '0', y1: '0', x2: '0', y2: '1' }, [
        svg('stop', { offset: '0', 'stop-color': '#f3ece1', 'stop-opacity': '0.2' }),
        svg('stop', { offset: '1', 'stop-color': '#f3ece1', 'stop-opacity': '0.06' }),
      ]),
      svg('linearGradient', { id: 'earphones-gold', x1: '0', y1: '0', x2: '0', y2: '1' }, [
        svg('stop', { offset: '0', 'stop-color': '#fff3dc' }),
        svg('stop', { offset: '1', 'stop-color': '#c9a46c' }),
      ]),
    ]),
    svg('circle', { cx, cy, r: o, class: 'earphones-path' }),
    // The shoulders, a soft rounded bar a little behind the head.
    svg('rect', { x: cx - 44, y: cy + 1, width: 88, height: 24, rx: 12, class: 'earphones-shoulders' }),
    // The nose's tip, peeking out ahead of the head.
    svg('ellipse', { cx, cy: cy - 27, rx: 4.5, ry: 5, class: 'earphones-nose' }),
    svg('ellipse', { cx, cy: cy - 1, rx: 22, ry: 25, class: 'earphones-head' }),
    // A sheen on the hair, lit from the upper left.
    svg('ellipse', { cx: cx - 7, cy: cy - 12, rx: 9, ry: 6, class: 'earphones-sheen' }),
    // The band, over the crown from ear to ear, with a highlight along it.
    svg('path', { d: `M${cx - 23} ${cy - 2} C${cx - 20} ${cy - 10} ${cx + 20} ${cy - 10} ${cx + 23} ${cy - 2}`, class: 'earphones-band' }),
    svg('path', { d: `M${cx - 19} ${cy - 6.5} C${cx - 12} ${cy - 10} ${cx + 12} ${cy - 10} ${cx + 19} ${cy - 6.5}`, class: 'earphones-band-light' }),
    cup(cx - 31),
    cup(cx + 20),
    svg('text', { x: cx - 56, y: cy + 4, class: 'earphones-side' }, []),
    svg('text', { x: cx + 56, y: cy + 4, class: 'earphones-side' }, []),
    orbit,
  ]);
  node.querySelector('title').textContent = 'A head with headphones, seen from above, and a sound circling it';
  const [left, right] = node.querySelectorAll('.earphones-side');
  left.textContent = 'L';
  right.textContent = 'R';
  return { node, orbit };
}

function headphonesIcon() {
  return svg('svg', { viewBox: '0 0 24 24', class: 'onboarding-preview-play', 'aria-hidden': 'true' }, [
    svg('path', { d: 'M4 14v-4a8 8 0 0 1 16 0v4' }),
    svg('rect', { x: 3, y: 13, width: 4, height: 7, rx: 1.5 }),
    svg('rect', { x: 17, y: 13, width: 4, height: 7, rx: 1.5 }),
  ]);
}

function stopIcon() {
  return svg('svg', { viewBox: '0 0 24 24', class: 'onboarding-preview-stop', 'aria-hidden': 'true' }, [
    svg('rect', { x: 6, y: 6, width: 12, height: 12, rx: 2 }),
  ]);
}

function button(className, label) {
  const node = el('button', className, [label]);
  node.type = 'button';
  return node;
}

function el(tag, className, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}
