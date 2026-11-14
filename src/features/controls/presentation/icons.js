import { svg } from '../../../shared/svg.js';

/** Stroke icon paths in a 24x24 box. */
const ICON_PATHS = Object.freeze({
  reduceMotion: ['M4 4l16 16', 'M7.5 5.5A8 8 0 0 1 18.5 16.5', 'M5.5 7.5A8 8 0 0 0 16.5 18.5'],
  fullscreen: ['M4 9V4h5', 'M15 4h5v5', 'M20 15v5h-5', 'M9 20H4v-5'],
  volume: ['M4 9h4l5-4v14l-5-4H4z', 'M16 9.5a3.5 3.5 0 0 1 0 5', 'M18.5 7a7 7 0 0 1 0 10'],
  chevronUp: ['M6 15l6-6 6 6'],
  chevronDown: ['M6 9l6 6 6-6'],
});

export const Icon = Object.freeze(Object.fromEntries(Object.keys(ICON_PATHS).map((key) => [key, key])));

/** @param {string} name one of Icon */
export function createIcon(name) {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', class: 'icon', 'aria-hidden': 'true' },
    ICON_PATHS[name].map((d) => svg('path', { d })),
  );
}
