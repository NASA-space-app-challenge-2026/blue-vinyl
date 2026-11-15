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
 * @returns {{ open: () => void }}
 */
export function createInfoDialog(parent, { id, title, subtitle, body }) {
  const dialog = el('dialog', 'info-dialog');
  dialog.id = id;
  dialog.setAttribute('aria-labelledby', `${id}-title`);

  const heading = el('h2', 'info-title', [title]);
  heading.id = `${id}-title`;
  const headingGroup = el('div', 'info-heading', [heading]);
  if (subtitle) headingGroup.append(el('p', 'info-subtitle', [subtitle]));

  const close = el('button', 'info-close', [createCloseIcon()]);
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => dialog.close());

  const content = el('div', 'info-body', body);
  dialog.append(el('header', 'info-header', [headingGroup, close]), content);

  // A click on the backdrop lands on the dialog itself, outside its box.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right
      && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) dialog.close();
  });

  parent.append(dialog);
  return {
    open() {
      content.scrollTop = 0;
      dialog.showModal();
      close.focus();
    },
  };
}

/**
 * The About dialog's body.
 *
 * @param {import('../domain/info.js').AboutContent} about
 * @param {{ title: string, category: string }[]} albums each album's title and category label
 * @returns {Node[]}
 */
export function renderAbout(about, albums) {
  const intro = about.intro.map((text) => el('p', 'info-lead', [text]));

  const how = el('dl', 'info-grid', about.howItWorks.flatMap(({ title, body }) => [
    el('dt', '', [title]),
    el('dd', '', [body]),
  ]));

  const albumList = el('ol', 'info-albums', albums.map(({ title, category }) => el('li', '', [
    el('span', 'info-album-title', [title]),
    el('span', 'info-album-category', [category]),
  ])));

  const shortcuts = el('dl', 'info-keys', about.shortcuts.flatMap(({ keys, action }) => [
    el('dt', '', [el('kbd', '', [keys])]),
    el('dd', '', [action]),
  ]));

  const team = el('ul', 'info-team', about.team.map(({ name, role, github }) => {
    const item = el('li', '', [el('span', 'info-team-name', [name])]);
    if (role) item.append(el('span', 'info-team-role', [role]));
    if (github) item.append(link(`@${github}`, `https://github.com/${github}`));
    return item;
  }));

  return [
    ...intro,
    el('p', 'info-challenge', ['Made for ', link(about.challenge.label, about.challenge.url), '.']),
    section('How it works', [how]),
    section('Albums', [albumList]),
    section('Listening', [shortcuts]),
    section(about.teamName, [team]),
    el('p', 'info-fineprint', [about.disclaimer]),
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
