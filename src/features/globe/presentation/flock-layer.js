// A flock's year on the globe: the trail it has flown so far and a dot where it is now, which pulses as the lead
// plays a note.

// How long the globe takes to turn to a new flock.
const TURN_MS = 1200;
const TRAIL_STROKE = 1.2;
// The dot swells by up to this factor on the strongest note and settles back over PULSE_MS.
const PULSE = Object.freeze({ scale: 2.2, ms: 360 });

/** Degrees east from `from` to `to` the short way round, in (-180, 180]. */
function lonStep(from, to) {
  return ((((to - from + 180) % 360) + 360) % 360) - 180;
}

/**
 * @typedef {{ lat: number, lon: number }} FlockPosition
 */

/**
 * @param {Object} globe a globe.gl instance
 */
export function attachFlockLayer(globe) {
  const dot = document.createElement('div');
  dot.className = 'globe-flock';
  const marker = { lat: 0, lng: 0 };
  /** @type {FlockPosition[]} */
  let year = [];
  let shownDay = -1;

  globe
    .pathPoints('points')
    .pathPointLat((p) => p.lat)
    .pathPointLng((p) => p.lon)
    .pathStroke(TRAIL_STROKE)
    .pathTransitionDuration(0)
    .htmlLat('lat')
    .htmlLng('lng')
    .htmlElement(() => dot)
    .htmlTransitionDuration(0);

  /**
   * Shows a flock's year from its start, and turns the globe to face it.
   *
   * @param {FlockPosition[]} days
   * @param {string} color CSS color
   */
  function show(days, color) {
    year = days;
    shownDay = -1;
    dot.style.setProperty('--flock-color', color);
    globe.pathColor(() => color);
    setDay(0);
    globe.pointOfView(centre(days), TURN_MS);
  }

  function hide() {
    year = [];
    globe.pathsData([]).htmlElementsData([]);
  }

  /** @param {number} day fractional day into the year; the dot glides between days */
  function setDay(day) {
    if (!year.length) return;
    const last = year.length - 1;
    const i = Math.min(last, Math.max(0, Math.floor(day)));
    const next = year[Math.min(last, i + 1)];
    const f = Math.min(1, Math.max(0, day - i));
    marker.lat = year[i].lat + f * (next.lat - year[i].lat);
    marker.lng = year[i].lon + f * lonStep(year[i].lon, next.lon);
    globe.htmlElementsData([marker]);
    if (i !== shownDay) {
      shownDay = i;
      globe.pathsData([{ points: year.slice(0, i + 1) }]);
    }
  }

  /** @param {number} strength 0..1 */
  function pulse(strength) {
    dot.animate([{ scale: 1 + strength * (PULSE.scale - 1) }, { scale: 1 }], { duration: PULSE.ms, easing: 'ease-out' });
  }

  return { show, hide, setDay, pulse };
}

// The middle of a flock's year: its mean latitude and circular mean longitude.
function centre(days) {
  const rad = Math.PI / 180;
  const x = days.reduce((sum, d) => sum + Math.cos(d.lon * rad), 0);
  const y = days.reduce((sum, d) => sum + Math.sin(d.lon * rad), 0);
  const lat = days.reduce((sum, d) => sum + d.lat, 0) / days.length;
  return { lat, lng: Math.atan2(y, x) / rad };
}
