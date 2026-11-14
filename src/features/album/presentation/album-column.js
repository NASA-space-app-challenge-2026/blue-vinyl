import { wrapIndex } from '../domain/album.js';
import { createAlbumCover } from './album-cover.js';

// Neighbouring sleeves drawn, in places from the current one (negative above it).
const NEIGHBOUR_PLACES = Object.freeze([-1, 1]);
// Extra turn (deg) a sleeve has per place off the stage, so it spins in as it is tossed onto the stage and spins
// away as it leaves; each sleeve settles at its own album's tilt.
const TOSS_SPIN_DEG = 10;
// A sleeve landing in the middle swings past its tilt by `share` of the spin, `at` that point of the move, then
// settles back.
const TOSS_OVERSHOOT = Object.freeze({ share: 0.15, at: 0.7 });
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
 * @param {{ onSelectTrack: (trackIndex: number) => void }} options  a track of the current album's sleeve was clicked
 */
export function createAlbumColumn(parent, albums, { onSelectTrack }) {
  const sleeve = createAlbumCover(parent, { onSelectTrack });
  const neighbours = NEIGHBOUR_PLACES.map((place) => {
    const cover = createAlbumCover(parent);
    cover.el.classList.add('album-cover-neighbour');
    cover.el.inert = true;
    cover.el.setAttribute('aria-hidden', 'true');
    return { place, cover };
  });
  const sleeves = [sleeve.el, ...neighbours.map(({ cover }) => cover.el)];
  // Each sleeve's place in the column, as `sleeves`.
  const places = [0, ...neighbours.map(({ place: at }) => at)];
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

  /**
   * Lines the neighbours up above and below the sleeve and shows them; returns the sleeve in client pixels: its centre,
   * side, right edge (its tilted corners included) and the spacing between sleeves.
   */
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
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, size: el.offsetWidth, right: rect.right, spacing };
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
    return sleeves.flatMap((el, i) => [
      el.animate(keyframes, options),
      el.animate(spinKeyframes((places[i] + from) * TOSS_SPIN_DEG, (places[i] + to) * TOSS_SPIN_DEG), options),
    ]);
  }

  // A sleeve spinning onto the stage swings past its tilt and settles back; any other spin is straight.
  function spinKeyframes(fromDeg, toDeg) {
    if (toDeg !== 0 || fromDeg === 0) return [{ rotate: `${fromDeg}deg` }, { rotate: `${toDeg}deg` }];
    const { share, at } = TOSS_OVERSHOOT;
    return [{ rotate: `${fromDeg}deg` }, { rotate: `${-fromDeg * share}deg`, offset: at }, { rotate: '0deg' }];
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
