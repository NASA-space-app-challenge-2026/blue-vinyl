// Turntable geometry in vinyl radii: the record centre is the origin, its edge is at radius 1, and screen
// directions use y down. Bearings are degrees clockwise from up.

const RAD = Math.PI / 180;

/** Grooves run from the outer edge (album start) to the inner edge (album end). */
export const GROOVE = Object.freeze({ outerRadius: 0.95, innerRadius: 0.66 });

/** The label (and the globe in it) starts right where the grooves end. */
export const LABEL_RADIUS = GROOVE.innerRadius;

/**
 * Tonearm pivoting at about 1 o'clock. It reads the right side of the record from the outer groove inward
 * and rests with its needle `restRadius` from the centre, just off the record's right edge.
 */
export const TONEARM = Object.freeze({
  pivotClockDeg: 40,
  pivotDistance: 1.25,
  armLength: 1.1,
  restRadius: 1.12,
});

export const PIVOT = Object.freeze({
  x: TONEARM.pivotDistance * Math.sin(TONEARM.pivotClockDeg * RAD),
  y: -TONEARM.pivotDistance * Math.cos(TONEARM.pivotClockDeg * RAD),
});

/** Platter speed, and the seconds it takes to spin up from a stop and to coast down from full speed. */
export const PLATTER = Object.freeze({ rpm: 100 / 3, spinUpSec: 0.7, spinDownSec: 1.2 });

/** Grooves are evenly pitched, so the needle's radius falls linearly with album progress (0..1). */
export function grooveRadius(progress) {
  return GROOVE.outerRadius + progress * (GROOVE.innerRadius - GROOVE.outerRadius);
}

/**
 * Arm bearing that puts the needle `radius` from the record centre, swung counter-clockwise from the
 * pivot-to-centre line so the needle reads the right side.
 */
export function armBearing(radius) {
  const { pivotDistance, armLength, pivotClockDeg } = TONEARM;
  const cos = (pivotDistance ** 2 + armLength ** 2 - radius ** 2) / (2 * pivotDistance * armLength);
  return pivotClockDeg + 180 - Math.acos(cos) / RAD;
}

export function needleAt(bearing) {
  return {
    x: PIVOT.x + TONEARM.armLength * Math.sin(bearing * RAD),
    y: PIVOT.y - TONEARM.armLength * Math.cos(bearing * RAD),
  };
}

export function needleRadius(bearing) {
  const needle = needleAt(bearing);
  return Math.hypot(needle.x, needle.y);
}

/** Inverse of armBearing: album progress (clamped to 0..1) of the groove under the needle at `bearing`. */
export function progressAt(bearing) {
  const progress = (GROOVE.outerRadius - needleRadius(bearing)) / (GROOVE.outerRadius - GROOVE.innerRadius);
  return Math.min(1, Math.max(0, progress));
}

/** The arm swings between its rest and the innermost groove. */
export const REST_BEARING = armBearing(TONEARM.restRadius);
export const INNER_BEARING = armBearing(GROOVE.innerRadius);
