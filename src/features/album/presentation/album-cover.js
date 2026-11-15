import { ALBUM_CATEGORY_LABEL, trackCover } from '../domain/album.js';
import { ALBUM_NOTES } from '../data/album-notes.js';

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

function formatDuration(sec) {
  const whole = Math.round(sec);
  const minutes = Math.floor(whole / 60);
  const seconds = String(whole % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Album sleeve with title and track list on the front, and liner notes on the back.
 * The face leans in 3D toward the mouse like a card held in the hand.
 * Clicking the "Liner Notes" button in the top right flips the sleeve to the back.
 *
 * @param {HTMLElement} parent
 * @param {{ onSelectTrack?: (trackIndex: number) => void }} [options]
 */
export function createAlbumCover(parent, { onSelectTrack } = {}) {
  const cover = el('article', 'album-cover');
  const flipper = el('div', 'album-cover-flipper');
  const face = el('div', 'album-cover-face');
  const counter = el('p', 'album-cover-counter');
  const noteBtn = el('button', 'album-cover-note-btn');
  const body = el('div', 'album-cover-body');

  const back = el('div', 'album-cover-back');
  const backHeader = el('div', 'album-cover-back-header');
  const backCategory = el('p', 'album-cover-category');
  const backTitle = el('h2', 'album-cover-back-title');
  const backSubtitle = el('p', 'album-cover-back-subtitle');
  const flipBackBtn = el('button', 'album-cover-flip-back-btn');
  const backScroll = el('div', 'album-cover-back-scroll');

  let album = null;
  let image = null;
  let items = [];

  // Front layout
  noteBtn.type = 'button';
  noteBtn.setAttribute('aria-label', '앨범 노트 보기');
  noteBtn.textContent = '앨범 노트';
  noteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  noteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cover.classList.add('is-flipped');
  });

  face.append(counter, noteBtn, body);

  // Back layout
  flipBackBtn.type = 'button';
  flipBackBtn.setAttribute('aria-label', '커버로 돌아가기');
  flipBackBtn.append(el('span', 'album-cover-flip-back-icon', '✕'), el('span', 'album-cover-flip-back-text', '커버 보기'));
  flipBackBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  flipBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cover.classList.remove('is-flipped');
  });

  backHeader.append(backCategory, backTitle, backSubtitle, flipBackBtn);
  back.append(backHeader, backScroll);

  flipper.append(face, back);
  cover.append(flipper);
  parent.append(cover);

  // Only a mouse hovers; a touch dragging across the sleeve would leave it leaning.
  cover.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    if (cover.classList.contains('is-flipped')) return;
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
   * Renders the back-side docent notes.
   * @param {import('../domain/album.js').Album} targetAlbum
   */
  function renderNotes(targetAlbum) {
    const notes = ALBUM_NOTES[targetAlbum.id];
    backCategory.textContent = ALBUM_CATEGORY_LABEL[targetAlbum.category] || '';
    backTitle.textContent = notes?.title || targetAlbum.title;
    backSubtitle.textContent = notes?.subtitle || '';

    backScroll.replaceChildren();

    if (!notes) {
      const p = el('p', 'album-cover-note-item', '이 앨범의 라이너 노트가 준비 중입니다.');
      backScroll.append(p);
      return;
    }

    // 1. Docent Tip Card (Highlight)
    if (notes.docentTip) {
      const docentCard = el('div', 'album-cover-note-card docent-tip-card');
      const tipHeader = el('h4', 'album-cover-note-section-title', '🎙️ 도슨트 감상 팁');
      const tipText = el('p', 'album-cover-note-desc', notes.docentTip);
      docentCard.append(tipHeader, tipText);
      backScroll.append(docentCard);
    }

    // 2. Data & Message
    const infoSection = el('section', 'album-cover-note-section');
    const dataTitle = el('h4', 'album-cover-note-section-title', '📡 데이터 출처');
    const dataText = el('p', 'album-cover-note-desc', notes.dataSource);
    const msgTitle = el('h4', 'album-cover-note-section-title', '🌍 전달하는 메시지');
    const msgText = el('p', 'album-cover-note-desc', notes.message);
    infoSection.append(dataTitle, dataText, msgTitle, msgText);
    backScroll.append(infoSection);

    // 3. Visual & Audio
    const guideSection = el('section', 'album-cover-note-section');
    const visualTitle = el('h4', 'album-cover-note-section-title', '👀 눈으로 보는 시각화 (Globe)');
    const visualText = el('p', 'album-cover-note-desc', notes.globeVisual);
    const soundTitle = el('h4', 'album-cover-note-section-title', '🎧 귀로 듣는 청각화 (Music)');
    const soundText = el('p', 'album-cover-note-desc', notes.sonification);
    guideSection.append(visualTitle, visualText, soundTitle, soundText);
    backScroll.append(guideSection);

    // 4. Tracks
    if (notes.tracks && notes.tracks.length > 0) {
      const trackSection = el('section', 'album-cover-note-section');
      const trackListTitle = el('h4', 'album-cover-note-section-title', '🎵 수록곡 안내');
      const trackList = el('ul', 'album-cover-note-track-list');
      notes.tracks.forEach((t, i) => {
        const li = el('li', 'album-cover-note-track-item');
        const strong = el('strong', 'album-cover-note-track-name', `${i + 1}. ${t.name}`);
        const span = el('span', 'album-cover-note-track-desc', `: ${t.desc}`);
        li.append(strong, span);
        trackList.append(li);
      });
      trackSection.append(trackListTitle, trackList);
      backScroll.append(trackSection);
    }
  }

  /**
   * @param {{ album: import('../domain/album.js').Album, index: number, count: number }} options
   * @param {Map<string, HTMLImageElement>} [drawn] covers other sleeves show, by URL, for this one to take its own from
   */
  function setAlbum({ album: next, index, count }, drawn) {
    album = next;
    // Another album's sleeve shows its front from the start, not turning over to it from the last album's notes.
    if (cover.classList.contains('is-flipped')) {
      cover.classList.add('is-flipped-instantly');
      cover.classList.remove('is-flipped');
      void flipper.offsetWidth;
      cover.classList.remove('is-flipped-instantly');
    }
    showCover(trackCover(album, 0).url, false, drawn);
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
    body.replaceChildren(el('p', 'album-cover-category', ALBUM_CATEGORY_LABEL[album.category]), el('h1', 'album-cover-title', album.title), list);

    renderNotes(album);
  }

  /** @param {number} activeTrackIndex */
  function render(activeTrackIndex) {
    showCover(trackCover(album, activeTrackIndex).url, true);
    items.forEach((item, i) => item.classList.toggle('is-active', i === activeTrackIndex));
  }

  return {
    el: cover,
    setAlbum,
    render,
    /** The cover image shown, or null. */
    get image() {
      return image?.parentNode === face ? image : null;
    },
  };
}
