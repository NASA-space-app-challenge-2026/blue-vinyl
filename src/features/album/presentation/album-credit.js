import { trackCover } from '../domain/album.js';

/** @param {HTMLElement} parent */
export function createAlbumCredit(parent) {
  const credit = document.createElement('p');
  credit.className = 'album-credit';
  parent.append(credit);

  /**
   * Credits the cover the sleeve shows while the track at `trackIndex` is current.
   *
   * @param {import('../domain/album.js').Album} album
   * @param {number} trackIndex
   */
  function render(album, trackIndex) {
    const text = trackCover(album, trackIndex).credit;
    if (credit.textContent !== text) credit.textContent = text;
  }

  return { render };
}
