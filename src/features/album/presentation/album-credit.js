/** @param {HTMLElement} parent */
export function createAlbumCredit(parent) {
  const credit = document.createElement('p');
  credit.className = 'album-credit';
  parent.append(credit);

  /** @param {import('../domain/album.js').Album} album */
  function render(album) {
    credit.textContent = album.coverCredit;
  }

  return { render };
}
