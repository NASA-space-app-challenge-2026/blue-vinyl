'use strict';

// Hijiki, the Live2D black cat, sitting in the bottom right corner.
// Rendered by live2d-widget (global L2Dwidget, loaded in index.html).

const HIJIKI_MODEL_URL = 'https://unpkg.com/live2d-widget-model-hijiki@1.0.5/assets/hijiki.model.json';
const MOBILE_MAX_WIDTH = 768;

const DISPLAY = Object.freeze({
  desktop: Object.freeze({ width: 150, height: 300, hOffset: 0, vOffset: -20 }),
  mobile: Object.freeze({ width: 80, height: 160, hOffset: -10, vOffset: -30 }),
});

export function createCatView() {
  const size = window.innerWidth <= MOBILE_MAX_WIDTH ? DISPLAY.mobile : DISPLAY.desktop;
  window.L2Dwidget.init({
    model: { jsonPath: HIJIKI_MODEL_URL, scale: 1 },
    display: { position: 'right', ...size },
    mobile: { show: true, scale: 1.0 },
    react: { opacityDefault: 0.7, opacityOnHover: 0.2 },
  });
}
