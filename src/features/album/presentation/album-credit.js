/**
 * @param {HTMLElement} parent
 * @param {import('../domain/album.js').Album} album
 */
export function createAlbumCredit(parent, album) {
  const credit = document.createElement('p');
  credit.className = 'album-credit';
  credit.textContent = album.coverCredit;
  parent.append(credit);
}
