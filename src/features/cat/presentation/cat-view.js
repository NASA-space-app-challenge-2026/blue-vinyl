'use strict';

import { createCatSound } from '../data/cat-sound.js';

// Hijiki, the Live2D black cat, sitting in the bottom right corner.
// Rendered by live2d-widget (global L2Dwidget, loaded in index.html).

const HIJIKI_MODEL_URL = 'https://unpkg.com/live2d-widget-model-hijiki@1.0.5/assets/hijiki.model.json';
const MOBILE_MAX_WIDTH = 768;
// The element live2d-widget draws the cat in (its default name.div).
const WIDGET_ID = 'live2d-widget';

const DISPLAY = Object.freeze({
  desktop: Object.freeze({ width: 150, height: 300, hOffset: 0, vOffset: -20 }),
  mobile: Object.freeze({ width: 80, height: 160, hOffset: -10, vOffset: -30 }),
});

/**
 * @param {HTMLElement} screen the element the layout is drawn in; the cat sits in its corner, so it turns with it when
 *   a portrait screen is drawn rotated to landscape (see app.css)
 */
export function createCatView(screen) {
  const catSound = createCatSound();
  const size = window.innerWidth <= MOBILE_MAX_WIDTH ? DISPLAY.mobile : DISPLAY.desktop;
  window.L2Dwidget.init({
    model: { jsonPath: HIJIKI_MODEL_URL, scale: 1 },
    display: { position: 'right', ...size },
    mobile: { show: true, scale: 1.0 },
    react: { opacityDefault: 0.7, opacityOnHover: 0.2 },
  });
  // The widget adds its element to the body once its model code has loaded; it is moved into the screen from there.
  const observer = new MutationObserver(() => {
    const widget = document.getElementById(WIDGET_ID);
    if (!widget) return;
    observer.disconnect();
    screen.append(widget);

    const onMeow = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      catSound.play();
      const canvas = document.getElementById('live2dcanvas');
      if (canvas) {
        canvas.classList.remove('meowing');
        void canvas.offsetWidth;
        canvas.classList.add('meowing');
        canvas.addEventListener(
          'animationend',
          () => canvas.classList.remove('meowing'),
          { once: true },
        );
      }
    };

    widget.addEventListener('pointerdown', onMeow);
  });
  observer.observe(document.body, { childList: true });
}
