import { GlobeTheme } from '../domain/globe-theme.js';

/** @type {Readonly<Record<string, import('../domain/globe-theme.js').GlobeThemeSource>>} */
export const GLOBE_THEMES = Object.freeze({
  [GlobeTheme.MAP]: {
    label: 'Map',
    attribution: 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors',
    tileUrl: (x, y, level) => `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${level}/${y}/${x}`,
  },
  [GlobeTheme.SATELLITE]: {
    label: 'Satellite',
    attribution: 'Imagery: NASA Blue Marble',
    // NASA Blue Marble, as shipped with three-globe's examples.
    imageUrl: 'https://cdn.jsdelivr.net/npm/three-globe@2.45.6/example/img/earth-blue-marble.jpg',
  },
});
