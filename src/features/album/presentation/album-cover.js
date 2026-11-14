/**
 * Album sleeve. Falls back to a plain placeholder while the cover image is missing.
 *
 * @param {HTMLElement} parent
 * @param {import('../domain/album.js').Album} album
 */
export function createAlbumCover(parent, album) {
  const cover = document.createElement('figure');
  cover.className = 'album-cover';

  const img = document.createElement('img');
  img.src = album.coverUrl;
  img.alt = `${album.title} cover`;
  img.addEventListener('error', () => img.remove());

  const caption = document.createElement('figcaption');
  caption.textContent = album.title;

  cover.append(img, caption);
  parent.append(cover);
}
