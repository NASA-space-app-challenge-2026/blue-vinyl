/**
 * A colour ramp through `stops`, each [at (0..1, ascending), [r, g, b]]: the returned function gives the CSS colour at
 * a share (clamped to 0..1), blended between the stops on either side.
 *
 * @param {[number, [number, number, number]][]} stops
 * @returns {(share: number) => string}
 */
export function colorRamp(stops) {
  return (share) => {
    const x = Math.min(1, Math.max(0, share));
    const i = Math.max(0, stops.findIndex(([at]) => at >= x) - 1);
    const [from, a] = stops[i];
    const [to, b] = stops[Math.min(i + 1, stops.length - 1)];
    const f = to > from ? (x - from) / (to - from) : 0;
    return `rgb(${a.map((v, k) => Math.round(v + f * (b[k] - v))).join(', ')})`;
  };
}
