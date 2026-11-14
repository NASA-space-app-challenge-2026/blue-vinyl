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
 */
export function createAlbumCover(parent) {
  const cover = el('article', 'album-cover');
  const counter = el('p', 'album-cover-counter');
  const body = el('div', 'album-cover-body');
  let image = null;
  let items = [];

  cover.append(el('div', 'album-cover-shade'), counter, body);
  parent.append(cover);

  /** @param {{ album: import('../domain/album.js').Album, index: number, count: number }} options */
  function setAlbum({ album, index, count }) {
    image?.remove();
    const img = el('img', 'album-cover-image');
    img.src = album.coverUrl;
    img.alt = '';
    img.addEventListener('error', () => img.remove());
    cover.prepend(img);
    image = img;

    counter.textContent = `${index + 1} / ${count}`;

    const list = el('ol', 'album-cover-tracks');
    items = album.tracks.map((track) => {
      const item = el('li', 'album-cover-track');
      item.append(el('span', 'album-cover-track-title', track.title), el('span', 'album-cover-track-duration', formatDuration(track.durationSec)));
      return item;
    });
    list.append(...items);
    body.replaceChildren(el('p', 'album-cover-category', CATEGORY_LABEL[album.category]), el('h1', 'album-cover-title', album.title), list);
  }

  /** @param {number} activeTrackIndex */
  function render(activeTrackIndex) {
    items.forEach((item, i) => item.classList.toggle('is-active', i === activeTrackIndex));
  }

  return { el: cover, setAlbum, render };
}
