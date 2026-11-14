// The date printed on the globe at 6 o'clock. It sits in the globe's container and is sized with it (see the
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

  /** @param {number | null} time ms into the year (UTC), or null to show nothing */
  function show(time) {
    showDigits(el, time === null ? '' : new Date(time).toLocaleDateString(LOCALE, FORMAT));
  }

  return { show };
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
