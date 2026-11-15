// Glass capsule buttons to toggle visibility and sound of the four aerosol particle stems.
// Shows an informative tooltip caption on hover explaining each particle type and its sound stem.

import { createRovingFocus } from '../../../shared/roving-focus.js';

const PARTICLES = [
  {
    id: 'salt',
    name: 'Sea Salt',
    desc: "Ocean spray churned up by Erin's winds (blue) · Violin at the eye, strings and timpani with its winds",
    color: '#4080ff',
  },
  {
    id: 'dust',
    name: 'Dust',
    desc: 'Desert sand crossing the Atlantic (pink) · Guitar at the Sahara, harp where it lands',
    color: '#ff58a0',
  },
  {
    id: 'smoke',
    name: 'Smoke',
    desc: 'Wildfire smoke (orange) · Cello at the fire, horn where it drifts',
    color: '#ff7820',
  },
  {
    id: 'sulfate',
    name: 'Sulfate',
    desc: 'Volcanic and pollution sulfate (green) · Celesta at Etna, vibraphone where it drifts',
    color: '#50d060',
  },
];

/**
 * Creates the 4 particle toggles with floating hover captions attached below the globe.
 *
 * @param {HTMLElement} parent
 * @param {(toggles: { salt: boolean, dust: boolean, smoke: boolean, sulfate: boolean }) => void} onChange
 */
export function createParticleToggles(parent, onChange) {
  // Wrapper container holding both the tooltip caption and the capsule, anchored below the globe
  const wrapper = document.createElement('div');
  wrapper.className = 'particle-toggles-wrapper';
  wrapper.style.cssText = `
    position: absolute;
    top: calc(100% + 14px);
    left: 50%;
    transform: translateX(-50%);
    display: none;
    flex-direction: column;
    align-items: center;
    z-index: 20;
    pointer-events: auto;
  `;

  // Prevent clicks or drags on toggles from bubbling up to the turntable or rotating the globe
  wrapper.addEventListener('pointerdown', (e) => e.stopPropagation());
  wrapper.addEventListener('pointerup', (e) => e.stopPropagation());
  wrapper.addEventListener('mousedown', (e) => e.stopPropagation());
  wrapper.addEventListener('click', (e) => e.stopPropagation());

  // Floating hover caption bubble
  const caption = document.createElement('div');
  caption.className = 'particle-caption';
  // Each toggle carries the same words as its description.
  caption.setAttribute('aria-hidden', 'true');
  caption.style.cssText = `
    position: absolute;
    bottom: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 14px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    color: #f1f5f9;
    font-size: 12px;
    line-height: 1.4;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
  `;
  wrapper.append(caption);

  const container = document.createElement('div');
  container.className = 'glass-capsule particle-toggles';
  container.setAttribute('role', 'toolbar');
  container.setAttribute('aria-label', 'Particles');
  container.style.cssText = `
    display: flex;
    align-items: center;
  `;

  const states = {
    salt: true,
    dust: true,
    smoke: true,
    sulfate: true,
  };

  const buttons = new Map();

  for (const { id, name, desc, color } of PARTICLES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'glass-segment particle-toggle active';
    // A toggle button: its name stays, its pressed state says whether the stem is on.
    btn.setAttribute('aria-label', name);
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-description', desc);

    // Glowing indicator dot
    const dot = document.createElement('span');
    dot.className = 'particle-dot';
    dot.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: ${color};
      box-shadow: 0 0 8px ${color};
      transition: opacity 0.2s, transform 0.2s;
    `;
    btn.append(dot);

    // Hover caption handlers, on keyboard focus too
    const showCaption = () => {
      caption.innerHTML = `<strong style="color: ${color};">${name}</strong> <span style="opacity: 0.85; margin-left: 6px;">${desc}</span>`;
      caption.style.opacity = '1';
      caption.style.transform = 'translateX(-50%) translateY(-2px)';
    };
    const hideCaption = () => {
      caption.style.opacity = '0';
      caption.style.transform = 'translateX(-50%) translateY(0)';
    };
    btn.addEventListener('mouseenter', showCaption);
    btn.addEventListener('mouseleave', hideCaption);
    btn.addEventListener('focus', () => {
      if (btn.matches(':focus-visible')) showCaption();
    });
    btn.addEventListener('blur', hideCaption);

    // Click toggle handler
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      states[id] = !states[id];
      btn.classList.toggle('active', states[id]);
      btn.setAttribute('aria-pressed', String(states[id]));
      dot.style.opacity = states[id] ? '1.0' : '0.2';
      dot.style.transform = states[id] ? 'scale(1.0)' : 'scale(0.7)';
      dot.style.boxShadow = states[id] ? `0 0 8px ${color}` : 'none';
      onChange({ ...states });
    });

    buttons.set(id, btn);
    container.append(btn);
  }

  createRovingFocus(container, { selector: '.particle-toggle' });
  wrapper.append(container);
  parent.append(wrapper);

  return {
    show() {
      wrapper.style.display = 'flex';
      container.hidden = false;
    },
    hide() {
      wrapper.style.display = 'none';
      container.hidden = true;
      caption.style.opacity = '0';
    },
    get states() {
      return { ...states };
    },
  };
}
