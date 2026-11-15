// What the docent says, and for how long. While the docent is on, an album opens with the docent's introduction
// before its first track, for as long as its words take to say: spoken, it ends when the voice does. That length is
// estimated, for the sleeve's list and for when no voice is heard (no speech synthesis, or none starts), at the pace
// of a device voice at its normal rate, with its pause between sentences (macOS: 45 words in about 26 s).
const WORDS_PER_SEC = 1.8;

/**
 * The docent's introduction to an album, opening with its title so a listener knows which album it is.
 *
 * @param {string} albumTitle
 * @param {string | undefined} tip the album's introduction (its liner notes' docentTip)
 */
export function introText(albumTitle, tip) {
  return tip ? `${albumTitle}. ${tip}` : `${albumTitle}.`;
}

/**
 * What the docent says as a track begins: its number and title.
 *
 * @param {number} trackIndex from 0
 * @param {string} title
 */
export function trackAnnouncement(trackIndex, title) {
  return `Track ${trackIndex + 1}: ${title}.`;
}

// The most words in one caption: two short lines in the bubble, so it stays small and clear of the globe.
const CAPTION_WORDS = 12;
// Words a long phrase is best cut before, so a caption ends where a speaker would draw breath.
const BREAK_BEFORE = new Set(['and', 'as', 'when', 'while', 'but', 'then', 'before', 'after', 'because', 'so', 'or', 'where', 'which', 'that', 'to', 'into', 'from', 'with', 'across', 'over', 'up']);

/**
 * The docent's words as sentences, each said as one (so the voice flows), and each cut into captions shown in turn:
 * where the sentence pauses (a comma, colon or semicolon), and a phrase still too long before a joining word near its
 * middle, so that no caption runs much past CAPTION_WORDS.
 *
 * @param {string} text
 * @returns {{ text: string, captions: { text: string, start: number, wordsBefore: number }[] }[]}
 *   each sentence, and its captions with where each starts in it (character index, as a voice's word boundary
 *   reports) and how many of its words come before
 */
export function docentSentences(text) {
  const sentences = text.match(/[^.!?]+[.!?]+["”]?/g)?.map((s) => s.trim()) ?? [text.trim()];
  return sentences.map((sentence) => {
    const words = sentence.split(/\s+/);
    const cuts = [];
    let from = 0;
    while (words.length - from > CAPTION_WORDS) {
      cuts.push((from = cutAt(words, from)));
    }
    const bounds = [0, ...cuts, words.length];
    let start = 0;
    const captions = bounds.slice(0, -1).map((at, i) => {
      const line = words.slice(at, bounds[i + 1]).join(' ');
      const caption = { text: line, start, wordsBefore: at };
      start += line.length + 1;
      return caption;
    });
    return { text: sentence, captions };
  });
}

// Where the caption starting at word `from` ends: after a pause within its reach, else before a joining word nearest
// the middle of what is left, else halfway.
function cutAt(words, from) {
  const last = Math.min(words.length - 1, from + CAPTION_WORDS);
  for (let i = last; i > from + 3; i -= 1) {
    if (/[,;:]$/.test(words[i - 1])) return i;
  }
  const ideal = from + Math.min(CAPTION_WORDS, Math.ceil((words.length - from) / 2));
  let best = -1;
  for (let i = from + 4; i <= last; i += 1) {
    if (BREAK_BEFORE.has(words[i].toLowerCase()) && (best === -1 || Math.abs(i - ideal) < Math.abs(best - ideal))) best = i;
  }
  let at = best === -1 ? ideal : best;
  // Never leave a caption hanging on a little word that leads into the next ("the", "a", "of").
  while (at > from + 4 && /^(the|a|an|of|its|their|in|on|at)$/i.test(words[at - 1])) at -= 1;
  return at;
}

/**
 * How long the docent's words last, in whole seconds.
 *
 * @param {string | undefined} text what the docent says
 */
export function docentIntroSec(text) {
  const words = text?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_SEC));
}
