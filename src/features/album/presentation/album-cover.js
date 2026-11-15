import { createRovingFocus } from '../../../shared/roving-focus.js';
import { spokenDuration } from '../../../shared/spoken-duration.js';
import { ALBUM_CATEGORY_LABEL, formatDuration, trackCover } from '../domain/album.js';

// Each sleeve lies at its own angle, picked from its place in the catalog so it is the same every time. It always
// leans the same way and never stands straight.
const TILT = Object.freeze({ minDeg: -3, maxDeg: -1 });
const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;
// Most the face leans (deg) toward or away from the pointer at the sleeve's edges.
const HOVER_TILT_DEG = 1.5;

/** @param {number} index place in the catalog; neighbouring places get well spread angles */
function tiltDeg(index) {
  const spread = (index * GOLDEN_RATIO) % 1;
  return TILT.minDeg + spread * (TILT.maxDeg - TILT.minDeg);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Album sleeve with title and track list. It shows the current track's cover (see trackCover), fading from one to the
 * next, and falls back to a plain backdrop while the cover image is missing.
 * The track list takes one Tab stop, the up and down arrow keys moving between its tracks; the playing one is marked.
 * The face leans in 3D toward the mouse like a card held in the hand. Clicking a track calls `onSelectTrack` with its
 * index.
 *
 * @param {HTMLElement} parent
 * @param {{ onSelectTrack?: (trackIndex: number) => void }} [options]
 */
export function createAlbumCover(parent, { onSelectTrack } = {}) {
  const cover = el('article', 'album-cover');
  const counter = el('p', 'album-cover-counter');
  const body = el('div', 'album-cover-body');
  const face = el('div', 'album-cover-face');
  let album = null;
  let image = null;
  let items = [];
  let buttons = [];
  const tracks = createRovingFocus(body, { selector: '.album-cover-track-button', orientation: 'vertical' });

  face.append(counter, body);
  cover.append(face);
  parent.append(cover);

  // Only a mouse hovers; a touch dragging across the sleeve would leave it leaning.
  cover.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const rect = cover.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    face.style.setProperty('--hover-x', `${-y * HOVER_TILT_DEG}deg`);
    face.style.setProperty('--hover-y', `${x * HOVER_TILT_DEG}deg`);
  });
  cover.addEventListener('pointerleave', () => {
    face.style.removeProperty('--hover-x');
    face.style.removeProperty('--hover-y');
  });

  // Fades `url` in over the covers shown, which go once it is in; another album's cover replaces them at once. That
  // one is taken from `drawn` when another sleeve already shows it, else shown once decoded, so the sleeve never shows
  // a blank or half-drawn cover in between (as a phone would while the record is drawn out of it).
  function showCover(url, fade, drawn) {
    if (image?.getAttribute('src') === url && image.parentNode === face) return;
    const taken = fade ? null : drawn?.get(url);
    if (taken) {
      drawn.delete(url);
      face.querySelectorAll('.album-cover-image').forEach((other) => other.remove());
      // Shown even if the other sleeve was still waiting for it to decode.
      taken.style.transition = 'none';
      taken.classList.add('is-shown');
      counter.before(taken);
      image = taken;
      return;
    }
    const img = el('img', 'album-cover-image');
    img.src = url;
    img.alt = '';
    img.addEventListener('error', () => img.remove());
    const removeOthers = () => face.querySelectorAll('.album-cover-image').forEach((other) => other !== img && other.remove());
    if (!fade) {
      img.decode().catch(() => {}).then(() => {
        if (image !== img) return;
        removeOthers();
        // At once, without the fade.
        img.style.transition = 'none';
        img.classList.add('is-shown');
      });
    } else {
      img.addEventListener('load', () => img.classList.add('is-shown'), { once: true });
      img.addEventListener('transitionend', removeOthers, { once: true });
    }
    counter.before(img);
    image = img;
  }

  /**
   * @param {{ album: import('../domain/album.js').Album, index: number, count: number }} options
   * @param {Map<string, HTMLImageElement>} [drawn] covers other sleeves show, by URL, for this one to take its own from
   */
  function setAlbum({ album: next, index, count }, drawn) {
    album = next;
    showCover(trackCover(album, 0).url, false, drawn);
    cover.style.setProperty('--tilt', `${tiltDeg(index)}deg`);

    counter.textContent = `${index + 1} / ${count}`;
    counter.setAttribute('aria-label', `Album ${index + 1} of ${count}`);

    const list = el('ol', 'album-cover-tracks');
    list.setAttribute('aria-label', 'Tracks');
    buttons = [];
    items = album.tracks.map((track, i) => {
      const item = el('li', 'album-cover-track');
      const button = el('button', 'album-cover-track-button');
      button.type = 'button';
      // "1:20" would be read out as "1 colon 20".
      button.setAttribute('aria-label', `${track.title}, ${spokenDuration(track.durationSec)}`);
      button.append(el('span', 'album-cover-track-title', track.title), el('span', 'album-cover-track-duration', formatDuration(track.durationSec)));
      button.addEventListener('click', () => onSelectTrack?.(i));
      item.append(button);
      buttons.push(button);
      return item;
    });
    list.append(...items);
    // The app's name is the page's one h1.
    body.replaceChildren(el('p', 'album-cover-category', ALBUM_CATEGORY_LABEL[album.category]), el('h2', 'album-cover-title', album.title), list);
  }

  /** @param {number} activeTrackIndex */
  function render(activeTrackIndex) {
    showCover(trackCover(album, activeTrackIndex).url, true);
    items.forEach((item, i) => item.classList.toggle('is-active', i === activeTrackIndex));
    buttons.forEach((button, i) => {
      if (i === activeTrackIndex) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    // Tabbing into the list lands on the playing track.
    if (buttons[activeTrackIndex]) tracks.setCurrent(buttons[activeTrackIndex]);
  }

  return {
    el: cover,
    setAlbum,
    render,
    /** Focuses the track the list's Tab stop is on. */
    focusTracks: tracks.focus,
    /** The cover image shown, or null. */
    get image() {
      return image?.parentNode === face ? image : null;
    },
  };
}
