import { svg } from '../../../shared/svg.js';

const SETTINGS_ICON_PATHS = ['M4 7h16', 'M4 17h16'];
const SETTINGS_ICON_KNOBS = [
  { cx: 9, cy: 7 },
  { cx: 15, cy: 17 },
];

function createSettingsIcon() {
  return svg('svg', { viewBox: '0 0 24 24', class: 'settings-icon', 'aria-hidden': 'true' }, [
    ...SETTINGS_ICON_PATHS.map((d) => svg('path', { d })),
    ...SETTINGS_ICON_KNOBS.map((knob) => svg('circle', { ...knob, r: 2.5 })),
  ]);
}

/**
 * Settings button with a popover. Holds the globe theme choice for now.
 *
 * @param {HTMLElement} parent
 * @param {{
 *   globeThemes: { value: string, label: string }[],
 *   globeTheme: string,
 *   onGlobeThemeChange: (theme: string) => void,
 * }} options
 */
export function createSettingsMenu(parent, { globeThemes, globeTheme, onGlobeThemeChange }) {
  const root = document.createElement('div');
  root.className = 'settings';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'settings-toggle';
  toggle.setAttribute('aria-label', 'Settings');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'settings-panel');
  toggle.append(createSettingsIcon());

  const panel = document.createElement('div');
  panel.id = 'settings-panel';
  panel.className = 'settings-panel';
  panel.hidden = true;

  const group = document.createElement('fieldset');
  group.className = 'settings-group';
  const legend = document.createElement('legend');
  legend.textContent = 'Globe';
  group.append(legend);
  for (const { value, label } of globeThemes) {
    const option = document.createElement('label');
    option.className = 'settings-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'globe-theme';
    input.value = value;
    input.checked = value === globeTheme;
    input.addEventListener('change', () => onGlobeThemeChange(value));
    option.append(input, label);
    group.append(option);
  }
  panel.append(group);

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  document.addEventListener('click', (event) => {
    if (!root.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  root.append(toggle, panel);
  parent.append(root);
}
