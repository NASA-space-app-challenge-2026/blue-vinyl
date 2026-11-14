const SVG_NS = 'http://www.w3.org/2000/svg';
const MERIDIAN_RATIOS = [0.35, 0.75];
const PARALLEL_RATIOS = [-0.5, 0, 0.5];

function svg(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

/**
 * Static wireframe globe, centered at (0, 0). Stands in until the real globe view lands.
 *
 * @param {number} radius
 * @returns {SVGGElement}
 */
export function createGlobePlaceholder(radius) {
  const r = radius * 0.92;
  const group = svg('g', { class: 'globe-placeholder' });
  group.append(svg('circle', { r, class: 'globe-sphere' }));
  for (const ratio of MERIDIAN_RATIOS) {
    group.append(svg('ellipse', { rx: r * ratio, ry: r, class: 'globe-line' }));
  }
  group.append(svg('line', { x1: 0, y1: -r, x2: 0, y2: r, class: 'globe-line' }));
  for (const ratio of PARALLEL_RATIOS) {
    const y = r * ratio;
    const half = Math.sqrt(r * r - y * y);
    group.append(svg('line', { x1: -half, y1: y, x2: half, y2: y, class: 'globe-line' }));
  }
  return group;
}
