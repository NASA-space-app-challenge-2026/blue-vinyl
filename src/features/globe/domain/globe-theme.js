export const GlobeTheme = Object.freeze({
  /** Dark gray street-map tiles. */
  MAP: 'map',
  /** Desaturated satellite imagery. */
  SATELLITE: 'satellite',
});

export const DEFAULT_GLOBE_THEME = GlobeTheme.MAP;

/**
 * How a theme paints the globe surface: either slippy-map tiles or one equirectangular image.
 *
 * @typedef {Object} GlobeThemeSource
 * @property {string} label
 * @property {string} attribution
 * @property {(x: number, y: number, level: number) => string} [tileUrl]
 * @property {string} [imageUrl]
 */
