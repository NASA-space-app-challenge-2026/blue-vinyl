import { svg } from '../../../shared/svg.js';

/**
 * Creates an element with a class and children (strings become text).
 *
 * @param {string} tag
 * @param {string} [className]
 * @param {(Node | string)[]} [children]
 */
function el(tag, className, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

/** A link that opens in a new tab, or plain text when there is no URL. */
function link(text, url) {
  if (!url) return document.createTextNode(text);
  const a = el('a', 'info-link', [text]);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function createCloseIcon() {
  return svg('svg', { viewBox: '0 0 24 24', class: 'info-close-icon', 'aria-hidden': 'true' }, [
    svg('path', { d: 'M6 6l12 12M18 6L6 18' }),
  ]);
}

/**
 * A modal dialog with a title, a close button and a scrolling body. Escape, the close button or a click on the
 * backdrop closes it, and focus goes back to where it was.
 *
 * @param {HTMLElement} parent
 * @param {{ id: string, title: string, subtitle?: string, body: Node[] }} options
 * @returns {{ open: () => void, close: () => void }}
 */
export function createInfoDialog(parent, { id, title, subtitle, body }) {
  const dialog = el('dialog', 'info-dialog');
  dialog.id = id;

  /** Plays the closing animation, then closes; closes at once when motion is reduced. */
  function requestClose() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dialog.close();
      return;
    }
    dialog.classList.add('is-closing');
    dialog.addEventListener('animationend', () => {
      dialog.classList.remove('is-closing');
      dialog.close();
    }, { once: true });
  }

  dialog.setAttribute('aria-labelledby', `${id}-title`);

  const heading = el('h2', 'info-title', [title]);
  heading.id = `${id}-title`;
  const headingGroup = el('div', 'info-heading', [heading]);
  if (subtitle) headingGroup.append(el('p', 'info-subtitle', [subtitle]));

  const close = el('button', 'info-close', [createCloseIcon()]);
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', requestClose);

  const content = el('div', 'info-body', body);
  dialog.append(el('header', 'info-header', [headingGroup, close]), content);

  // A click on the backdrop lands on the dialog itself, outside its box.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right
      && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) requestClose();
  });

  // Escape would close the dialog at once, so it is held back until the closing animation has played.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    requestClose();
  });

  parent.append(dialog);
  return {
    open() {
      content.scrollTop = 0;
      dialog.showModal();
      close.focus();
    },
    close: requestClose,
  };
}

/**
 * The About dialog's body.
 *
 * @param {import('../domain/info.js').AboutContent} about
 * @param {{ title: string, category: string }[]} albums each album's title and category label
 * @param {(index: number) => void} onSelectAlbum called with the index of the album that was clicked
 * @returns {Node[]}
 */
export function renderAbout(about, albums, onSelectAlbum) {
  const intro = about.intro.map((text) => el('p', 'info-lead', [text]));

  const how = el('dl', 'info-grid', about.howItWorks.flatMap(({ title, body }) => [
    el('dt', '', [title]),
    el('dd', '', [body]),
  ]));

  const albumList = el('ol', 'info-rows info-albums', albums.map(({ title, category }, index) => {
    const row = el('button', 'info-row', [
      el('span', 'info-row-title', [title]),
      el('span', 'info-row-note', [category]),
    ]);
    row.type = 'button';
    row.addEventListener('click', () => onSelectAlbum(index));
    return el('li', '', [row]);
  }));

  const shortcuts = el('dl', 'info-keys', about.shortcuts.flatMap(({ keys, action }) => [
    el('dt', '', [el('kbd', '', [keys])]),
    el('dd', '', [action]),
  ]));

  const team = el('ul', 'info-rows', about.team.map(({ name, role, github }) => {
    const row = el(github ? 'a' : 'div', 'info-row', [el('span', 'info-row-title', [name])]);
    if (role) row.append(el('span', 'info-row-note', [role]));
    if (github) {
      row.href = `https://github.com/${github}`;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
      row.append(el('span', 'info-row-note', [`@${github}`]));
    }
    return el('li', '', [row]);
  }));

  const version = el('ul', 'info-rows', [el('li', '', [el('div', 'info-row', [
    el('span', 'info-row-title', ['Blue Vinyl']),
    el('span', 'info-row-note', [about.version]),
  ])])]);

  return [
    ...intro,
    el('p', 'info-challenge', ['Made for ', link(about.challenge.label, about.challenge.url), '.']),
    section('How it works', [how]),
    section('Albums', [albumList]),
    section('Shortcuts', [shortcuts]),
    section('Made by', [team]),
    section('Version', [version]),
  ];
}

/**
 * The License dialog's body.
 *
 * @param {readonly import('../domain/info.js').LicenseSection[]} sections
 * @returns {Node[]}
 */
export function renderLicenses(sections) {
  return sections.map(({ title, note, works }) => section(title, [
    ...(note ? [el('p', 'info-note', [note])] : []),
    el('ul', 'info-works', works.map((work) => el('li', 'info-work', [
      el('div', 'info-work-head', [
        el('span', 'info-work-name', [link(work.name, work.url)]),
        el('span', 'info-license', [link(work.license, work.licenseUrl)]),
      ]),
      el('p', 'info-work-by', [work.use ? `${work.by} · ${work.use}` : work.by]),
    ]))),
  ]));
}

function section(title, children) {
  return el('section', 'info-section', [el('h3', 'info-section-title', [title]), ...children]);
}
