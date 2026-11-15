import { sentencesOf } from '../domain/docent.js';

/**
 * The docent speaking: its voice says the words a sentence at a time, a breath between each, and the bubble shows each
 * sentence whole as the voice begins it; when the voice is done, the bubble goes.
 *
 * @param {ReturnType<import('../data/docent-voice.js').createDocentVoice>} voice
 * @param {ReturnType<import('./docent-bubble.js').createDocentBubble>} bubble
 */
export function createDocentNarrator(voice, bubble) {
  return {
    /**
     * Says `words` from the start, cutting off whatever was being said, then calls `onEnd`.
     *
     * @param {string | import('../data/docent-audio.js').DocentLine[]} words text, said a sentence at a time, or its
     *   lines already made (some with their recordings; see introLines in docent-audio.js)
     * @param {() => void} [onEnd]
     */
    speak(words, onEnd) {
      const lines = typeof words === 'string' ? sentencesOf(words).map((text) => ({ text })) : words;
      voice.speak(lines, {
        onLine: (index) => bubble.show(lines[index].text),
        onEnd: () => {
          bubble.hideSoon();
          onEnd?.();
        },
      });
    },
    /** Holds the words where they are. */
    pause: () => voice.pause(),
    resume: () => voice.resume(),
    /** Falls silent at once, and the bubble goes. */
    cancel() {
      voice.cancel();
      bubble.hide();
    },
    /** Whether words are being said, breathed between or held. */
    get speaking() {
      return voice.speaking;
    },
  };
}
