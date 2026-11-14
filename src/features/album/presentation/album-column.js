import { wrapIndex } from '../domain/album.js';
import { createAlbumCover } from './album-cover.js';

// Neighbouring sleeves drawn, in places from the current one (negative above it).
const NEIGHBOUR_PLACES = Object.freeze([-1, 1]);
// The sleeve stacks over the record (the turntable is z-index 1) while it holds it.
const TUCKED_Z_INDEX = '2';

/**
 * The albums' sleeves standing in one vertical column, in catalog order and wrapping round it: the current album's
 * sleeve in the middle, the previous one's above it and the next one's below, each a viewport height away so they
 * stay off screen. Changing records moves the whole column one place (see createRecordSwap), and the albums are then
 * shifted back by one, so the column stands as before round the new album.
 *
 * @param {HTMLElement} parent
 * @param {import('../domain/album.js').Album[]} albums
 */
export function createAlbumColumn(parent, albums) {
  const sleeve = createAlbumCover(parent);
  const neighbours = NEIGHBOUR_PLACES.map((place) => {
    const cover = createAlbumCover(parent);
    cover.el.classList.add('album-cover-neighbour');
    cover.el.inert = true;
    cover.el.setAttribute('aria-hidden', 'true');
    return { place, cover };
  });
  const sleeves = [sleeve.el, ...neighbours.map(({ cover }) => cover.el)];
  let spacing = 0;

  /** @param {number} index */
  function setAlbum(index) {
    sleeve.setAlbum({ album: albums[index], index, count: albums.length });
    for (const { place, cover } of neighbours) {
      const i = wrapIndex(index + place, albums.length);
      cover.setAlbum({ album: albums[i], index: i, count: albums.length });
      cover.render(0);
    }
  }

  /** Lines the neighbours up above and below the sleeve and shows them; returns the sleeve in client pixels. */
  function place() {
    const { el } = sleeve;
    spacing = window.innerHeight;
    for (const { place: at, cover } of neighbours) {
      Object.assign(cover.el.style, {
        left: `${el.offsetLeft}px`,
        top: `${el.offsetTop + at * spacing}px`,
        width: `${el.offsetWidth}px`,
      });
      cover.el.hidden = false;
    }
    // The tilt turns the sleeve round its centre, so its bounding box keeps the centre.
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, size: el.offsetWidth, spacing };
  }

  /** @param {boolean} tucked whether the sleeve is drawn over the record */
  function setTucked(tucked) {
    for (const el of sleeves) el.style.zIndex = tucked ? TUCKED_Z_INDEX : '';
  }

  /**
   * Animates the column from `from` to `to` places down the stage (negative up).
   *
   * @param {number} from
   * @param {number} to
   * @param {KeyframeAnimationOptions} options
   */
  function moves(from, to, options) {
    const keyframes = [from, to].map((shift) => ({ translate: `0 ${shift * spacing}px` }));
    return sleeves.map((el) => el.animate(keyframes, options));
  }

  /** Back at rest in place, the neighbours hidden. */
  function settle() {
    for (const el of sleeves) for (const move of el.getAnimations()) move.cancel();
    setTucked(false);
    for (const { cover } of neighbours) cover.el.hidden = true;
  }

  settle();
  return { setAlbum, render: sleeve.render, place, setTucked, moves, settle };
}
