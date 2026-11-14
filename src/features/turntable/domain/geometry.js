/**
 * Turntable layout in SVG view-box units. Single source for both drawing and tonearm math.
 * The tonearm points straight down from its pivot at 0deg; positive angles swing it onto the record.
 */
export const TURNTABLE = Object.freeze({
  width: 520,
  height: 440,
  center: Object.freeze({ x: 220, y: 220 }),
  recordRadius: 210,
  labelRadius: 85,
  groove: Object.freeze({ outerRadius: 200, innerRadius: 95 }),
  tonearm: Object.freeze({
    pivot: Object.freeze({ x: 470, y: 50 }),
    length: 290,
    restAngleDeg: 0,
  }),
});

/** Grooves run from the outer edge (progress 0) to the inner edge (progress 1). */
export function grooveRadiusAt(progress) {
  const { outerRadius, innerRadius } = TURNTABLE.groove;
  return outerRadius - progress * (outerRadius - innerRadius);
}

/** Tonearm angle (deg) that puts the stylus on the groove at the given progress. */
export function tonearmAngleAt(progress) {
  const { center, tonearm } = TURNTABLE;
  const dx = center.x - tonearm.pivot.x;
  const dy = center.y - tonearm.pivot.y;
  const pivotToCenter = Math.hypot(dx, dy);
  const radius = grooveRadiusAt(progress);
  const L = tonearm.length;

  // Angle of the pivot->center direction, measured from straight down toward the record.
  const centerAngle = Math.atan2(-dx, dy);
  // Law of cosines: angle between the arm and the pivot->center line.
  const offset = Math.acos((L * L + pivotToCenter * pivotToCenter - radius * radius) / (2 * L * pivotToCenter));
  return ((centerAngle - offset) * 180) / Math.PI;
}
