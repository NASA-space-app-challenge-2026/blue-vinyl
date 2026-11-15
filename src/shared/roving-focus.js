// A group of controls that takes one Tab stop: only one of its items is tabbable at a time, and the arrow keys along
// the group's orientation, Home and End move the focus between them (the WAI-ARIA "roving tabindex" pattern).

/** The arrow keys that step through a group, by its orientation. */
const STEP_KEYS = Object.freeze({
  horizontal: Object.freeze({ ArrowLeft: -1, ArrowRight: 1 }),
  vertical: Object.freeze({ ArrowUp: -1, ArrowDown: 1 }),
});

/**
 * Whether `key`, pressed on `target`, moves the focus inside a roving group, so a page-wide shortcut on the same key
 * should leave it to the group.
 *
 * @param {EventTarget | null} target
 * @param {string} key
 */
export function isRovingKey(target, key) {
  if (!(target instanceof Element)) return false;
  const group = target.closest('[data-roving]');
  if (!(group instanceof HTMLElement)) return false;
  return key in STEP_KEYS[group.dataset.roving] || key === 'Home' || key === 'End';
}

/**
 * Makes `container` a roving group over the elements in it matching `selector`. Items may come and go, or be hidden,
 * later: the group keeps one shown item tabbable as they change.
 *
 * @param {HTMLElement} container
 * @param {{ selector: string, orientation?: 'horizontal' | 'vertical' }} options
 * @returns {{ setCurrent: (item: HTMLElement) => void, focus: () => void }} `setCurrent` makes `item` the tabbable
 *   one, unless the focus is in the group (then the item focused stays it); `focus` focuses the tabbable one
 */
export function createRovingFocus(container, { selector, orientation = 'horizontal' }) {
  container.dataset.roving = orientation;
  const steps = STEP_KEYS[orientation];
  /** @type {HTMLElement | null} */
  let current = null;

  /** @returns {HTMLElement[]} */
  function items() {
    return [...container.querySelectorAll(selector)].filter(
      (item) => item instanceof HTMLElement && !item.hidden && !item.closest('[hidden]') && !item.matches(':disabled'),
    );
  }

  // One item tabbable, the current one while it is still shown, else the first.
  function sync() {
    const all = items();
    if (!current || !all.includes(current)) current = all[0] ?? null;
    for (const item of all) {
      const tabIndex = item === current ? 0 : -1;
      if (item.tabIndex !== tabIndex) item.tabIndex = tabIndex;
    }
  }

  container.addEventListener('focusin', (event) => {
    const all = items();
    const item = all.find((it) => it === event.target);
    if (!item) return;
    current = item;
    sync();
  });

  container.addEventListener('keydown', (event) => {
    // A page-wide shortcut that took the key (as after a click, see main.js) keeps it.
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const all = items();
    const index = all.indexOf(/** @type {HTMLElement} */ (event.target));
    // Keys on anything else in the group (an open menu, a slider) are theirs.
    if (index < 0) return;
    let next;
    if (event.key in steps) next = (index + steps[event.key] + all.length) % all.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = all.length - 1;
    else return;
    event.preventDefault();
    all[next].focus();
  });

  // Items are added, re-rendered or hidden after the group is made.
  new MutationObserver(sync).observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'disabled'],
  });
  sync();

  return {
    setCurrent(item) {
      if (container.contains(document.activeElement)) return;
      current = item;
      sync();
    },
    focus() {
      sync();
      current?.focus({ preventScroll: true });
    },
  };
}
