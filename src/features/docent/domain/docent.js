// What the docent says, and for how long. While the docent is on, an album opens with the docent's introduction
// before its first track, for as long as its words take to say: spoken, it ends when the voice does. That length is
// estimated, for the sleeve's list and for when no voice is heard (no speech synthesis, or none starts), at the pace
// of a device voice at its normal rate (macOS: 45 words in about 26 s), with a breath between sentences.
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

// The breath the docent draws between sentences (s), so each one can settle before the next.
export const SENTENCE_GAP_SEC = 0.6;

/**
 * The docent's words as sentences: each is said, and shown in the bubble, whole and on its own.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function sentencesOf(text) {
  return text.match(/[^.!?]+[.!?]+["”]?/g)?.map((sentence) => sentence.trim()) ?? [text.trim()];
}

/**
 * How long the docent's words last, in whole seconds.
 *
 * @param {string | undefined} text what the docent says
 */
export function docentIntroSec(text) {
  const words = text?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const breaths = text ? sentencesOf(text).length - 1 : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_SEC + breaths * SENTENCE_GAP_SEC));
}
