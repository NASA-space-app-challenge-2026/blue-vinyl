/** @param {HTMLElement} parent */
export function createAlbumCredit(parent) {
  const credit = document.createElement('p');
  credit.className = 'album-credit';
  parent.append(credit);

  /**
   * @param {import('../domain/album.js').Album} album
   * @param {string[]} [more] further credits, such as the instruments the music plays
   */
  function render(album, more = []) {
    const lines = [album.coverCredit, album.dataCredit, ...more].filter(Boolean);
    credit.replaceChildren(...lines.flatMap((line, i) => (i === 0 ? [line] : [document.createElement('br'), line])));
  }

  return { render };
}
