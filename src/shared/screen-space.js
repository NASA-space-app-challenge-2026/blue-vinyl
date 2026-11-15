// The layout is drawn in one screen element, which a portrait viewport turns a quarter turn to show it landscape (see
// app.css). Client pixels then run along other axes than the layout's, so a view that measures elements or pointers
// to move or turn things in its own layout measures them in the screen's own pixels instead.

/**
 * How `screen` lies in client pixels: its turn and where its own top left corner is; null when it is not turned.
 *
 * @param {HTMLElement} screen
 */
function frameOf(screen) {
  const { transform } = getComputedStyle(screen);
  if (transform === 'none') return null;
  const { a, b, c, d } = new DOMMatrix(transform);
  const turn = new DOMMatrix([a, b, c, d, 0, 0]);
  // The screen's top left corner in client pixels: its turned corners' box is where the client box is.
  const corners = [
    [0, 0],
    [screen.offsetWidth, 0],
    [0, screen.offsetHeight],
    [screen.offsetWidth, screen.offsetHeight],
  ].map(([x, y]) => turn.transformPoint({ x, y }));
  const screenRect = screen.getBoundingClientRect();
  return {
    unturn: turn.inverse(),
    originX: screenRect.left - Math.min(...corners.map((p) => p.x)),
    originY: screenRect.top - Math.min(...corners.map((p) => p.y)),
  };
}

// A client point in the screen's own pixels, given its frame.
function toScreen(frame, x, y) {
  return frame.unturn.transformPoint({ x: x - frame.originX, y: y - frame.originY });
}

/**
 * The client point (`x`, `y`), such as a pointer event's, in the pixels of `screen`, measured from its top left corner,
 * however `screen` is turned; with no turn it is the client point.
 *
 * @param {HTMLElement} screen
 * @param {number} x
 * @param {number} y
 * @returns {{ x: number, y: number }}
 */
export function pointInScreen(screen, x, y) {
  const frame = frameOf(screen);
  return frame ? toScreen(frame, x, y) : { x, y };
}

/**
 * The bounding box of `el` in the pixels of `screen`, measured from its top left corner, however `screen` is turned.
 * Exact for turns of a quarter turn; with no turn it is the client box.
 *
 * @param {HTMLElement} screen
 * @param {Element} el
 * @returns {DOMRectReadOnly}
 */
export function rectInScreen(screen, el) {
  const rect = el.getBoundingClientRect();
  const frame = frameOf(screen);
  if (!frame) return rect;
  const points = [
    [rect.left, rect.top],
    [rect.right, rect.top],
    [rect.left, rect.bottom],
    [rect.right, rect.bottom],
  ].map(([x, y]) => toScreen(frame, x, y));
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return new DOMRectReadOnly(left, top, Math.max(...xs) - left, Math.max(...ys) - top);
}
