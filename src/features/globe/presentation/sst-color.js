// Colours of the sea surface temperature, shared by the field under a storm and the number beside it. As on SVS 5097,
// water warm enough for storms is yellow to red and cooler water is blue.

/** The SST number beside a storm: over water that lets it grow, or water that weakens it. */
export const SstColor = Object.freeze({
  GROWING: '#ffa25c',
  WEAKENING: '#7cc0ff',
});

// Band colours by their lowest temperature (°C), coldest first; the first band takes everything colder.
const BANDS = Object.freeze([
  [-Infinity, [44, 79, 158]],
  [22, [63, 120, 194]],
  [24, [110, 166, 216]],
  [25, [166, 208, 230]],
  [26, [214, 234, 238]],
  [26.5, [254, 224, 139]],
  [27, [253, 184, 99]],
  [28, [249, 142, 82]],
  [29, [232, 87, 62]],
  [30, [194, 42, 58]],
]);

/** The CSS colour of a field band starting at `fromC` (null for the coldest), at `opacity`. */
export function sstBandColor(fromC, opacity) {
  const [, [r, g, b]] = BANDS.findLast(([from]) => (fromC ?? -Infinity) >= from);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
