// Changing records: the record (vinyl, globe label and all) is lifted off the platter clear of the sleeve and slid
// into it, and the album column moves one place along like a vertical pager, the sleeve carrying the record off with
// it as the neighbouring album's sleeve comes into the middle. The albums are then shifted back by one, so the record
// is now in that sleeve, and it is drawn out back onto the platter. Every other change asked for meanwhile moves the
// column on another place once it is there; asked while the record is being drawn out, the record goes straight back
// into the sleeve, which the column carries off in turn. Only CSS `translate` and `scale` move, so the layout (and the
// sleeves' tilt, set through `transform`) stays as it is.

// Where the record sits: on the platter, off it just clear of the sleeve, or tucked inside the sleeve.
const Place = Object.freeze({ AT_PLATTER: 'atPlatter', CLEAR: 'clear', IN_SLEEVE: 'inSleeve' });
// Where the column is: as it stands, or one place along the way the album is left.
const Stage = Object.freeze({ ON: 0, ALONG: 1 });
// Share of the sleeve's half side the shrunk record spans; the rest hides its drop shadow too.
const SLEEVE_FILL = 0.88;
// Gap (in record radii) kept between the lifted record and the sleeve's right edge, its tilted corners included.
const CLEAR_GAP = 0.08;

// Poses in the order they are reached, each eased into from the one before over `ms`. `tucked` puts the sleeve over
// the record; it stays over it on the way to or from a tucked pose.
const ON_PLATTER = Object.freeze({ record: Place.AT_PLATTER, stage: Stage.ON, tucked: false });
const Leg = Object.freeze({
  PUT_AWAY: [
    { record: Place.CLEAR, stage: Stage.ON, tucked: false, ms: 260 },
    { record: Place.IN_SLEEVE, stage: Stage.ON, tucked: true, ms: 340 },
  ],
  // Tossed: fast off the mark and slowing as the new sleeve lands.
  MOVE_ALONG: [{ record: Place.IN_SLEEVE, stage: Stage.ALONG, tucked: true, ms: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }],
  // The column stands as before round the new album, at once.
  SHIFT_BACK: [{ record: Place.IN_SLEEVE, stage: Stage.ON, tucked: true, ms: 0 }],
  // Out of the sleeve onto the platter; the leg another change can turn back.
  DRAW_OUT: [
    { record: Place.CLEAR, stage: Stage.ON, tucked: false, ms: 340 },
    { record: Place.AT_PLATTER, stage: Stage.ON, tucked: false, ms: 260 },
  ],
});
// Easing of poses that name none.
const EASING = 'ease-in-out';

/**
 * @param {{
 *   recordEl: HTMLElement,
 *   recordGeometry: () => { x: number, y: number, r: number },
 *   column: {
 *     place: () => { x: number, y: number, size: number, right: number, spacing: number },
 *     setTucked: (tucked: boolean) => void,
 *     moves: (from: number, to: number, options: KeyframeAnimationOptions) => Animation[],
 *     settle: () => void,
 *   },
 * }} options
 *   recordGeometry: the record's centre and radius in client pixels, on the platter.
 *   column: the album column (see createAlbumColumn) the sleeve stands in.
 */
export function createRecordSwap({ recordEl, recordGeometry, column }) {
  let offsets = null;
  let scales = null;
  let spacing = 0;
  let from = ON_PLATTER;
  // True while play() runs.
  let playing = false;
  // While the record is drawn out: the moves under way, and whether another change has turned them back.
  let drawing = null;
  let turnedBack = false;

  function measure() {
    const record = recordGeometry();
    const sleeve = column.place();
    const shrunk = (SLEEVE_FILL * sleeve.size) / 2 / record.r;
    const toSleeveY = sleeve.y - record.y;
    scales = { [Place.AT_PLATTER]: 1, [Place.CLEAR]: shrunk, [Place.IN_SLEEVE]: shrunk };
    offsets = {
      [Place.AT_PLATTER]: { x: 0, y: 0 },
      [Place.CLEAR]: { x: sleeve.right - (record.x - shrunk * record.r) + CLEAR_GAP * record.r, y: toSleeveY },
      [Place.IN_SLEEVE]: { x: sleeve.x - record.x, y: toSleeveY },
    };
    spacing = sleeve.spacing;
  }

  // Places down the stage the column has moved; moving to the next album (`direction` 1) goes up.
  function shift(pose, direction) {
    return -pose.stage * direction;
  }

  function recordStyle(pose, direction) {
    const { x, y } = offsets[pose.record];
    return { translate: `${x}px ${y + shift(pose, direction) * spacing}px`, scale: `${scales[pose.record]}` };
  }

  // Moves from `from` to `pose`. `finished` resolves true if the move was turned back to where it began.
  function step(pose, direction) {
    const start = from;
    column.setTucked(start.tucked || pose.tucked);
    const options = { duration: pose.ms, easing: pose.easing ?? EASING, fill: 'both' };
    const moves = [
      recordEl.animate([recordStyle(start, direction), recordStyle(pose, direction)], options),
      ...column.moves(shift(start, direction), shift(pose, direction), options),
    ];
    const finished = Promise.all(moves.map((move) => move.finished)).then(() => {
      const reversed = moves[0].playbackRate < 0;
      from = reversed ? start : pose;
      return reversed;
    });
    return { moves, finished };
  }

  async function go(poses, direction) {
    for (const pose of poses) await step(pose, direction).finished;
  }

  // Draws the record out onto the platter; false if it was turned back into the sleeve instead.
  async function drawOut(direction) {
    turnedBack = false;
    const start = from;
    const poses = Leg.DRAW_OUT;
    let i = 0;
    for (; i < poses.length && !turnedBack; i++) {
      drawing = step(poses[i], direction);
      const reversed = await drawing.finished;
      // A move turned back mid-way ends where it began.
      if (reversed) break;
    }
    drawing = null;
    if (!turnedBack) return true;
    // Back through the poses already reached, the way each was reached.
    for (let j = i - 1; j >= 0; j--) {
      await go([{ ...(j ? poses[j - 1] : start), ms: poses[j].ms, easing: poses[j].easing }], direction);
    }
    return false;
  }

  /**
   * Plays the change. `direction` 1 moves the column up, bringing the next album (below) into the middle; -1 the
   * other way. Once the column is one place along, `swap(direction)` shifts the albums back; then `nextDirection()`
   * says whether to move along again (1 or -1) or to draw the record out (0); it is asked again once a record turned
   * back by skip() is in its sleeve. Resolves once a record is back on the platter.
   *
   * @param {number} direction
   * @param {(direction: number) => void} swap
   * @param {() => number} nextDirection
   */
  async function play(direction, swap, nextDirection) {
    playing = true;
    measure();
    from = ON_PLATTER;
    await go(Leg.PUT_AWAY, direction);
    for (let onPlatter = false; !onPlatter; ) {
      await go(Leg.MOVE_ALONG, direction);
      swap(direction);
      await go(Leg.SHIFT_BACK, direction);
      let next = nextDirection();
      while (!next && !onPlatter) {
        onPlatter = await drawOut(direction);
        if (!onPlatter) next = nextDirection();
      }
      direction = next;
    }
    for (const move of recordEl.getAnimations()) move.cancel();
    column.settle();
    playing = false;
  }

  /**
   * Another change is asked for while play() runs, for nextDirection() to count: a record being drawn out goes back
   * into its sleeve. False, changing nothing, when play() is not running.
   */
  function skip() {
    if (!playing) return false;
    if (drawing && !turnedBack) {
      turnedBack = true;
      for (const move of drawing.moves) if (move.playState === 'running') move.reverse();
    }
    return true;
  }

  return { play, skip };
}
