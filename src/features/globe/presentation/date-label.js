// The date (or other text of the moment, such as a month and its CO₂) printed on the globe at 6 o'clock. It sits in the globe's container and is sized with it (see the
// `.globe-date` styles).

const LOCALE = 'en';
// Month and a two-digit day, so the text keeps its width from day to day.
const FORMAT = Object.freeze({ month: 'short', day: '2-digit', timeZone: 'UTC' });

/** @param {HTMLElement} container the globe's container */
export function createDateLabel(container) {
  const el = document.createElement('div');
  el.className = 'globe-date';
  el.setAttribute('aria-hidden', 'true');
  container.append(el);

  /** @param {number | null} time ms since the epoch (UTC; for a track laid over one year, ms into it), or null to show nothing */
  function show(time) {
    showDigits(el, time === null ? '' : new Date(time).toLocaleDateString(LOCALE, FORMAT));
  }

  /** @param {string | null} text any text to print instead of a date, or null to show nothing */
  function showText(text) {
    showDigits(el, text ?? '');
  }

  return { show, showText };
}

// Each digit gets its own fixed-width cell (the font's digits are proportional), so centred text does not shift as
// it counts.
function showDigits(el, text) {
  if (text === el.textContent) return;
  el.replaceChildren(
    ...text
      .split(/(\d)/)
      .filter(Boolean)
      .map((piece) => {
        if (!/\d/.test(piece)) return piece;
        const digit = document.createElement('span');
        digit.className = 'globe-date-digit';
        digit.textContent = piece;
        return digit;
      })
  );
}
