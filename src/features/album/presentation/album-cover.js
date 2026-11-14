import { AlbumCategory } from '../domain/album.js';

const CATEGORY_LABEL = Object.freeze({
  [AlbumCategory.BIODIVERSITY]: 'Biodiversity',
});

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatDuration(sec) {
  const minutes = Math.floor(sec / 60);
  const seconds = String(Math.round(sec % 60)).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Album sleeve with title and track list. Falls back to a plain backdrop while the cover image is missing.
 *
 * @param {HTMLElement} parent
 * @param {{ album: import('../domain/album.js').Album, index: number, count: number }} options
 */
export function createAlbumCover(parent, { album, index, count }) {
  const cover = el('article', 'album-cover');

  const img = el('img', 'album-cover-image');
  img.src = album.coverUrl;
  img.alt = '';
  img.addEventListener('error', () => img.remove());

  const counter = el('p', 'album-cover-counter', `${index + 1} / ${count}`);
  const notes = el('button', 'album-cover-notes', 'Notes');
  notes.type = 'button';

  const body = el('div', 'album-cover-body');
  const list = el('ol', 'album-cover-tracks');
  const items = album.tracks.map((track) => {
    const item = el('li', 'album-cover-track');
    item.append(el('span', 'album-cover-track-title', track.title), el('span', 'album-cover-track-duration', formatDuration(track.durationSec)));
    return item;
  });
  list.append(...items);
  body.append(el('p', 'album-cover-category', CATEGORY_LABEL[album.category]), el('h1', 'album-cover-title', album.title), list);

  cover.append(img, el('div', 'album-cover-shade'), counter, notes, body);
  parent.append(cover);

  /** @param {number} activeTrackIndex */
  function render(activeTrackIndex) {
    items.forEach((item, i) => item.classList.toggle('is-active', i === activeTrackIndex));
  }

  return { render };
}
