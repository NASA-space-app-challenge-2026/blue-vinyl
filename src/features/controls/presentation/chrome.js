// Screen-corner controls. Layout only for now: behavior is wired in later issues.

import { Language } from '../domain/language.js';
import { PlaybackState } from '../domain/playback-state.js';
import { Icon, createIcon } from './icons.js';

const LANGUAGE_LABEL = Object.freeze({
  [Language.EN]: 'EN',
  [Language.KO]: '한',
});

function button(className, label) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.setAttribute('aria-label', label);
  return node;
}

function iconButton(icon, label) {
  const node = button('icon-button', label);
  node.append(createIcon(icon));
  return node;
}

function pill(...children) {
  const node = document.createElement('div');
  node.className = 'pill';
  node.append(...children);
  return node;
}

/**
 * @param {HTMLElement} parent
 * @param {string} current one of Language
 */
export function createLanguageToggle(parent, current) {
  const options = Object.values(Language).map((language) => {
    const node = button('lang-option', language);
    node.textContent = LANGUAGE_LABEL[language];
    node.setAttribute('aria-pressed', String(language === current));
    return node;
  });
  parent.append(pill(...options));
}

/** @param {HTMLElement} parent */
export function createViewOptions(parent) {
  const divider = document.createElement('span');
  divider.className = 'pill-divider';
  parent.append(
    pill(iconButton(Icon.reduceMotion, 'Reduce motion'), iconButton(Icon.fullscreen, 'Fullscreen'), divider, iconButton(Icon.volume, 'Sound')),
  );
}

/** @param {HTMLElement} parent */
export function createAlbumNav(parent) {
  parent.append(pill(iconButton(Icon.chevronUp, 'Previous album'), iconButton(Icon.chevronDown, 'Next album')));
}

/** @param {HTMLElement} parent */
export function createPlayHint(parent) {
  const hint = document.createElement('p');
  hint.className = 'play-hint';
  parent.append(hint);

  /** @param {string} state one of PlaybackState */
  function render(state) {
    hint.textContent = state === PlaybackState.STOPPED ? 'Press Space to play' : 'Press Space to pause';
  }

  return { render };
}
