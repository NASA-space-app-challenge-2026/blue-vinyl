import { trackCover } from '../domain/album.js';

/** @param {HTMLElement} parent */
export function createAlbumCredit(parent) {
  const credit = document.createElement('p');
  credit.className = 'album-credit';
  parent.append(credit);
  let shown = null;

  /**
   * Credits the cover the sleeve shows while the track at `trackIndex` is current, the album's data, and any further
   * credits, one to a line.
   *
   * @param {import('../domain/album.js').Album} album
   * @param {number} trackIndex
   * @param {string[]} [more] further credits, such as the instruments the music plays
   */
  function render(album, trackIndex, more = []) {
    const lines = [trackCover(album, trackIndex).credit, album.dataCredit, ...more].filter(Boolean);
    const text = lines.join('\n');
    if (text === shown) return;
    shown = text;
    credit.replaceChildren(...lines.flatMap((line, i) => (i === 0 ? [line] : [document.createElement('br'), line])));
  }

  return { render };
}
