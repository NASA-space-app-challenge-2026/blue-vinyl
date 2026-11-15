// The docent's introduction plays before an album's first track while the docent is on, for as long as its words take
// to say. Spoken, it ends when the voice does; that length is estimated, for the sleeve's list and for when no voice
// is heard (no speech synthesis, or none starts), at an unhurried docent's pace.
// The pace of a device voice at its normal rate, with its pause between sentences (macOS: 45 words in about 26 s).
const WORDS_PER_SEC = 1.8;

/**
 * How long the docent's introduction lasts, in whole seconds.
 *
 * @param {string | undefined} text what the docent says
 */
export function docentIntroSec(text) {
  const words = text?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_SEC));
}
