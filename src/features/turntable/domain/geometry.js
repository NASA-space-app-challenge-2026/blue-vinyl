const GROOVE = Object.freeze({ outerRadius: 292, innerRadius: 204 });

/**
 * Turntable layout in SVG view-box units. Single source for both drawing and tonearm math.
 * The tonearm points straight down from its pivot at 0deg; positive angles swing it onto the record.
 */
export const TURNTABLE = Object.freeze({
  width: 720,
  height: 640,
  center: Object.freeze({ x: 320, y: 320 }),
  recordRadius: 300,
  // The label (and the globe in it) starts right where the grooves end.
  labelRadius: GROOVE.innerRadius,
  groove: GROOVE,
  tonearm: Object.freeze({
    pivot: Object.freeze({ x: 655, y: 90 }),
    length: 460,
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
