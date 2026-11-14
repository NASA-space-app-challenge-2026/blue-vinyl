import { AlbumCategory, trackCover } from '../domain/album.js';

const CATEGORY_LABEL = Object.freeze({
  [AlbumCategory.BIODIVERSITY]: 'Biodiversity',
  [AlbumCategory.CLIMATE]: 'Climate',
  [AlbumCategory.EXTREME_WEATHER]: 'Extreme Weather',
});

// Each sleeve lies at its own angle, picked from its place in the catalog so it is the same every time. It always
// leans the same way and never stands straight.
const TILT = Object.freeze({ minDeg: -6, maxDeg: -2 });
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

function formatDuration(sec) {
  const whole = Math.round(sec);
  const minutes = Math.floor(whole / 60);
  const seconds = String(whole % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Album sleeve with title and track list. It shows the current track's cover (see trackCover), fading from one to the
 * next, and falls back to a plain backdrop while the cover image is missing.
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

  face.append(el('div', 'album-cover-shade'), counter, body);
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

  // Fades `url` in over the covers shown, which go once it is in; another album's cover replaces them at once.
  function showCover(url, fade) {
    if (image?.getAttribute('src') === url) return;
    const img = el('img', 'album-cover-image');
    img.src = url;
    img.alt = '';
    img.addEventListener('error', () => img.remove());
    const removeOthers = () => face.querySelectorAll('.album-cover-image').forEach((other) => other !== img && other.remove());
    if (!fade) {
      removeOthers();
      img.classList.add('is-shown');
    } else {
      img.addEventListener('load', () => img.classList.add('is-shown'), { once: true });
      img.addEventListener('transitionend', removeOthers, { once: true });
    }
    face.querySelector('.album-cover-shade').before(img);
    image = img;
  }

  /** @param {{ album: import('../domain/album.js').Album, index: number, count: number }} options */
  function setAlbum({ album: next, index, count }) {
    album = next;
    showCover(trackCover(album, 0).url, false);
    cover.style.setProperty('--tilt', `${tiltDeg(index)}deg`);

    counter.textContent = `${index + 1} / ${count}`;

    const list = el('ol', 'album-cover-tracks');
    items = album.tracks.map((track, i) => {
      const item = el('li', 'album-cover-track');
      const button = el('button', 'album-cover-track-button');
      button.type = 'button';
      button.append(el('span', 'album-cover-track-title', track.title), el('span', 'album-cover-track-duration', formatDuration(track.durationSec)));
      button.addEventListener('click', () => onSelectTrack?.(i));
      item.append(button);
      return item;
    });
    list.append(...items);
    body.replaceChildren(el('p', 'album-cover-category', CATEGORY_LABEL[album.category]), el('h1', 'album-cover-title', album.title), list);
  }

  /** @param {number} activeTrackIndex */
  function render(activeTrackIndex) {
    showCover(trackCover(album, activeTrackIndex).url, true);
    items.forEach((item, i) => item.classList.toggle('is-active', i === activeTrackIndex));
  }

  return { el: cover, setAlbum, render };
}
