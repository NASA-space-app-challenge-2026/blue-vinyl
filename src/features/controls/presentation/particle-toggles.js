// Glass capsule buttons to toggle visibility and sound of the four aerosol particle stems.
// Shows an informative tooltip caption on hover explaining each particle type and its sound stem. Each is marked with its
// particle type's shape (PARTICLE_SHAPE). Every toggle can be switched off, the track's own type's too: that hides the
// type's air on the globe, while the track's particles, their paths and the lead's voice go on.

import { PARTICLE_SHAPE } from '../../tracks/domain/aerosol-paths.js';
import { svgPoints } from '../../globe/presentation/particle-shape.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const PARTICLES = [
  {
    id: 'salt',
    name: 'Sea Salt',
    desc: "Ocean spray churned up by Erin's winds",
    color: '#4080ff',
    shape: PARTICLE_SHAPE.seaSalt,
  },
  {
    id: 'dust',
    name: 'Dust',
    desc: 'Desert sand crossing the Atlantic',
    color: '#ff58a0',
    shape: PARTICLE_SHAPE.dust,
  },
  {
    id: 'smoke',
    name: 'Smoke',
    desc: 'Wildfire smoke',
    color: '#ff7820',
    shape: PARTICLE_SHAPE.smoke,
  },
  {
    id: 'sulfate',
    name: 'Sulfate',
    desc: 'Volcanic and pollution sulfate',
    color: '#50d060',
    shape: PARTICLE_SHAPE.sulfate,
  },
];

/**
 * Creates the 4 particle toggles with floating hover captions, inside the globe at its bottom.
 *
 * @param {HTMLElement} parent
 * @param {(toggles: { salt: boolean, dust: boolean, smoke: boolean, sulfate: boolean }) => void} onChange
 */
export function createParticleToggles(parent, onChange) {
  // Wrapper container holding both the tooltip caption and the capsule, anchored inside the globe at its bottom
  const wrapper = document.createElement('div');
  wrapper.className = 'particle-toggles-wrapper';
  wrapper.style.cssText = `
    position: absolute;
    bottom: 10%;
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

  function paint(id) {
    const { btn, dot, label, color } = buttons.get(id);
    btn.classList.toggle('active', states[id]);
    label.style.opacity = states[id] ? '0.9' : '0.4';
    dot.style.opacity = states[id] ? '1.0' : '0.2';
    dot.style.transform = states[id] ? 'scale(1.0)' : 'scale(0.7)';
    dot.style.filter = states[id] ? `drop-shadow(0 0 4px ${color})` : 'none';
  }

  for (const { id, name, desc, color, shape } of PARTICLES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'glass-segment particle-toggle active';
    btn.setAttribute('aria-label', `Toggle ${name}`);

    // Glowing indicator in the particle type's shape
    const dot = document.createElementNS(SVG_NS, 'svg');
    dot.classList.add('particle-dot');
    dot.setAttribute('viewBox', '-1 -1 2 2');
    dot.setAttribute('width', '14');
    dot.setAttribute('height', '14');
    dot.style.cssText = `
      overflow: visible;
      filter: drop-shadow(0 0 4px ${color});
      transition: opacity 0.2s, transform 0.2s;
    `;
    const outline = document.createElementNS(SVG_NS, 'polygon');
    outline.setAttribute('points', svgPoints(shape));
    outline.setAttribute('fill', color);
    dot.append(outline);

    // The particle type's name under its shape
    const label = document.createElement('span');
    label.className = 'particle-name';
    label.textContent = name;
    label.style.cssText = `
      font-size: 10px;
      line-height: 1;
      white-space: nowrap;
      transition: opacity 0.2s;
    `;
    // Wide and tall enough for the name under the shape
    btn.style.cssText = `
      width: auto;
      height: auto;
      gap: 5px;
      padding: 8px 10px 7px;
      border-radius: 999px;
    `;
    btn.append(dot, label);

    // Hover caption handlers
    btn.addEventListener('mouseenter', () => {
      caption.innerHTML = `<strong style="color: ${color};">${name}</strong> <span style="opacity: 0.85; margin-left: 6px;">${desc}</span>`;
      caption.style.opacity = '1';
      caption.style.transform = 'translateX(-50%) translateY(-2px)';
    });

    btn.addEventListener('mouseleave', () => {
      caption.style.opacity = '0';
      caption.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Click toggle handler
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      states[id] = !states[id];
      paint(id);
      onChange({ ...states });
    });

    buttons.set(id, { btn, dot, label, color });
    container.append(btn);
  }

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
    /** Starts a track: every particle type on. */
    reset() {
      for (const key of buttons.keys()) {
        states[key] = true;
        paint(key);
      }
      onChange({ ...states });
    },
    get states() {
      return { ...states };
    },
  };
}
