const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Creates an SVG element.
 *
 * @param {string} tag
 * @param {Record<string, string | number>} [attrs]
 * @param {Element[]} [children]
 */
export function svg(tag, attrs = {}, children = []) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  el.append(...children);
  return el;
}
