// The lens the globe is seen through, by its field of view: the narrower, the further away the camera sits to fit
// the globe to the label, and the more of the globe shows.
export const GlobeLens = Object.freeze({
  /** A near-orthographic disc from far away: a whole hemisphere, its edges as wide as its middle. */
  NARROW: Object.freeze({ fovDeg: 5 }),
  /** A perspective from close by (globe.gl's own lens): the middle drawn larger, the edges falling away. */
  WIDE: Object.freeze({ fovDeg: 50 }),
});

export const DEFAULT_GLOBE_LENS = GlobeLens.NARROW;
