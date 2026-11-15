// What the docent says over a forest track, so it can be followed by ear alone: the legend's lines while the noon line
// is already moving, when the map was drawn, and each region as the line reaches it. Each line is said once, at the step
// it belongs to; a screen reader reads it, and it can be spoken aloud.

import { BANDS, Band, LINE_STEPS, REGIONS } from '../../tracks/domain/noon-line.js';

const BAND_NAME = Object.freeze({ [Band.NORTH]: 'northern', [Band.TROPICS]: 'tropical', [Band.SOUTH]: 'southern' });
// Words for a region's forest: its mean height (m) and density, as the music plays them.
const HEIGHT_WORDS = Object.freeze([[16, 'tall'], [9, 'mid-height'], [0, 'low']]);
const DENSITY_WORDS = Object.freeze([[0.55, 'dense'], [0.25, 'patchy'], [0, 'sparse']]);
// A region's forest is described only where it is at least this tall on average (m).
const DESCRIBED_FROM_M = 5;

/**
 * The legend's lines, at the step each part of it starts (see composers/noon.js, which plays it).
 */
export function legendLines() {
  return [
    { step: 0, text: 'How to listen. Every tree is a note, as long as the tree takes to grow. Taller trees play higher and louder, on cello, viola, violin, flute and oboe.' },
    { step: 60, text: 'Many trees at once make a dense forest.' },
    { step: 90, text: 'Waves are the sea, a bell marks land, a tick every thirty degrees.' },
  ];
}

const word = (words, value) => words.find(([from]) => value >= from)[1];

/**
 * Every line of a track, by step from the track's start.
 *
 * @param {Object} options
 * @param {import('../../tracks/domain/noon-line.js').NoonLine} options.line
 * @param {boolean} options.legend  whether the track opens with the legend
 * @returns {{ step: number, text: string }[]}
 */
export function noonNarration({ line, legend }) {
  const lines = legend ? legendLines() : [];
  // Same clock as the noon line: regions are announced as the meridian reaches them.
  lines.push({
    step: 0,
    text: 'The Earth turns under the noon sun, over the forest GEDI mapped from April 2019 to March 2023.',
  });
  REGIONS.forEach((region, i) => {
    const first = Math.round(180 - region.fromLon);
    const end = i + 1 < REGIONS.length ? Math.round(180 - REGIONS[i + 1].fromLon) : LINE_STEPS;
    if (first === 0) return; // the opening line already stands there
    lines.push({ step: first, text: describe(region, line, first, end) });
  });
  return lines;
}

// "South America: tropical forest, tall and dense." The band with the most forest, from its mean over the region.
function describe(region, line, first, end) {
  const name = region.name[0].toUpperCase() + region.name.slice(1);
  if (!region.land) return `${name}.`;
  let best = null;
  for (const band of BANDS) {
    const { height, density, land } = line.bands[band];
    let sumH = 0;
    let sumD = 0;
    let n = 0;
    for (let s = first; s < end; s++) {
      if (!(land[s] >= 0.2) || !(height[s] >= 0)) continue;
      sumH += height[s];
      sumD += density[s] || 0;
      n++;
    }
    if (!n) continue;
    const mean = { band, height: sumH / n, density: sumD / n };
    if (!best || mean.height * (0.5 + mean.density) > best.height * (0.5 + best.density)) best = mean;
  }
  if (!best || best.height < DESCRIBED_FROM_M) return `${name}: little forest.`;
  return `${name}: ${BAND_NAME[best.band]} forest, ${word(HEIGHT_WORDS, best.height)} and ${word(DENSITY_WORDS, best.density)}.`;
}

