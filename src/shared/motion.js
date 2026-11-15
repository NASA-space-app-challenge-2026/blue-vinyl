// Whether the viewer asked the system for less motion. Asked anew each time, so turning the setting on or off applies
// from the next move without a reload.

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)');

export function prefersReducedMotion() {
  return REDUCE.matches;
}
