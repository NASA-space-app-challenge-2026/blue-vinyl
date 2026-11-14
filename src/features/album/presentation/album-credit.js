import { trackCover } from '../domain/album.js';

// Joins the credits into the one line the record's rim runs.
const SEPARATOR = '  ·  ';

/** @param {(text: string) => void} show puts the credits on screen (the turntable's rim, see setCredit) */
export function createAlbumCredit(show) {
  let shown = null;

  /**
   * Credits the cover the sleeve shows while the track at `trackIndex` is current, the album's data, and any further
   * credits.
   *
   * @param {import('../domain/album.js').Album} album
   * @param {number} trackIndex
   * @param {string[]} [more] further credits, such as the instruments the music plays and the globe's map
   */
  function render(album, trackIndex, more = []) {
    const text = [trackCover(album, trackIndex).credit, album.dataCredit, ...more].filter(Boolean).join(SEPARATOR);
    if (text === shown) return;
    shown = text;
    show(text);
  }

  return { render };
}
