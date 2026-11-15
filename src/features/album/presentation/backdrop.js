// The cover is shrunk to this many pixels a side before its colors are counted.
const SAMPLE_SIZE = 48;
// Bits kept of each RGB channel when pixels are grouped by color: 3 bits make 8 levels, 512 groups.
const BUCKET_BITS = 3;
// Pixels darker than this lightness (HSL, 0..1), such as black space around a globe, are left out when the main color
// is picked, so the backdrop does not come out near black. A cover that is dark all over still uses all its pixels.
const MIN_PIXEL_LIGHTNESS = 0.12;
// Lightness (HSL, 0..1) the backdrop's centre is held at or below, so the light text stays readable on it, and how
// much darker its rim is.
const BACKDROP_MAX_LIGHTNESS = 0.24;
const BACKDROP_DEEP_SHARE = 0.7;

/**
 * Main color of a loaded image: the mean of the pixels in the largest group of like colors, near-black pixels left out.
 *
 * @param {HTMLImageElement} img
 * @returns {{ r: number, g: number, b: number }}
 */
function mainColor(img) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const top = largestGroup(data, MIN_PIXEL_LIGHTNESS) ?? largestGroup(data, 0);
  return { r: top.r / top.count, g: top.g / top.count, b: top.b / top.count };
}

/**
 * The largest group of like colors among the pixels at or above `minLightness`, or null when there are none.
 *
 * @param {Uint8ClampedArray} data RGBA pixels
 * @param {number} minLightness HSL lightness, 0..1
 * @returns {{ r: number, g: number, b: number, count: number } | null}
 */
function largestGroup(data, minLightness) {
  const shift = 8 - BUCKET_BITS;
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (lightness({ r: data[i], g: data[i + 1], b: data[i + 2] }) < minLightness) continue;
    const key = ((data[i] >> shift) << (2 * BUCKET_BITS)) | ((data[i + 1] >> shift) << BUCKET_BITS) | (data[i + 2] >> shift);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += data[i];
    bucket.g += data[i + 1];
    bucket.b += data[i + 2];
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  if (buckets.size === 0) return null;
  return [...buckets.values()].reduce((best, bucket) => (bucket.count > best.count ? bucket : best));
}

// HSL lightness (0..1) of an RGB color (0..255 each).
const lightness = ({ r, g, b }) => (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255;

// `color` mixed with black so its every channel is `share` (0..1) of what it was.
const shade = ({ r, g, b }, share) => `rgb(${[r, g, b].map((v) => Math.round(v * share)).join(' ')})`;

/**
 * The page backdrop (--bg, --bg-deep) in the main color of the cover shown, darkened so the text stays readable. A
 * cover that fails to load leaves the default backdrop of app.css.
 *
 * @param {HTMLElement} root element the backdrop tokens are set on
 * @param {HTMLElement} fill the fixed layer under the page that iOS Safari takes its bars' and safe areas' color from
 */
export function createBackdrop(root, fill) {
  // Color per cover URL, so a cover is counted once.
  const colors = new Map();
  let shownUrl = null;
  // The browser's own bars take the backdrop's rim color from it; without it they take the page's background. Safari
  // does not follow a change of its content, so each color gets a new one.
  let themeColor = null;

  function apply(color) {
    if (!color) {
      root.style.removeProperty('--bg');
      root.style.removeProperty('--bg-deep');
      fill.style.removeProperty('background-color');
      themeColor?.remove();
      themeColor = null;
      return;
    }
    // Darkened by mixing with black, like the same color in shadow, so a pale tint stays a muted one.
    const l = lightness(color);
    const share = l > BACKDROP_MAX_LIGHTNESS ? BACKDROP_MAX_LIGHTNESS / l : 1;
    const deep = shade(color, share * BACKDROP_DEEP_SHARE);
    root.style.setProperty('--bg', shade(color, share));
    root.style.setProperty('--bg-deep', deep);
    // Set as the color itself, not var(--bg-deep), so the bars and the safe areas take it at once while the page fades.
    fill.style.setProperty('background-color', deep);
    themeColor?.remove();
    themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = deep;
    document.head.append(themeColor);
  }

  /** @param {string} url the cover image */
  function show(url) {
    if (url === shownUrl) return;
    shownUrl = url;
    if (colors.has(url)) {
      apply(colors.get(url));
      return;
    }
    const img = new Image();
    img.addEventListener('load', () => {
      colors.set(url, mainColor(img));
      if (shownUrl === url) apply(colors.get(url));
    });
    img.addEventListener('error', () => {
      colors.set(url, null);
      if (shownUrl === url) apply(null);
    });
    img.src = url;
  }

  return { show };
}
