import { ControlIcon, createControlIcon } from '../../controls/presentation/control-icons.js';

/**
 * A glass segment that turns the docent on and off. It starts off, its speech bubble struck through.
 *
 * @param {HTMLElement} parent a glass capsule
 * @param {{ onChange: (on: boolean) => void }} options
 */
export function createDocentToggle(parent, { onChange }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'glass-segment';
  let on = false;

  function render() {
    button.replaceChildren(createControlIcon(on ? ControlIcon.DOCENT : ControlIcon.DOCENT_OFF));
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on ? 'Turn the docent off' : 'Turn the docent on');
    button.title = on ? 'Docent on' : 'Docent off';
  }

  button.addEventListener('click', () => {
    on = !on;
    render();
    onChange(on);
  });

  render();
  parent.append(button);
}
