import { docentSentences } from '../domain/docent.js';

// Words a second the captions move through a sentence at, for a voice that does not report its words as it says them
// (Chrome's Google voices, about 2.9): where to start, and how much each sentence's own pace, once said, counts for in
// the next one's.
const START_WORDS_PER_SEC = 2.9;
const PACE_LEARNING = 0.6;
// How far ahead of its words a caption is shown when going by pace (s): better read a moment early than late.
const CAPTION_LEAD_SEC = 0.35;
// How often the captions are moved on by that pace (ms).
const CAPTION_TICK_MS = 100;

/**
 * The docent speaking: its voice says the words a sentence at a time, and the bubble shows them as captions, a phrase
 * at a time, each as it is said; when the voice is done, the bubble goes. A caption moves on at the word the voice
 * reports reaching, or, for a voice that reports none, at a speaker's pace from the start of its sentence.
 *
 * @param {ReturnType<import('../data/docent-voice.js').createDocentVoice>} voice
 * @param {ReturnType<import('./docent-bubble.js').createDocentBubble>} bubble
 */
export function createDocentNarrator(voice, bubble) {
  let sentences = [];
  // The sentence being said: its index, the caption shown, when it began, how long it was held, and whether the voice
  // reports its words.
  let current = null;
  let ticker = null;
  // The voice's pace, learnt from the sentences it has said.
  let wordsPerSec = START_WORDS_PER_SEC;

  function showCaption(caption) {
    if (current.caption === caption) return;
    current.caption = caption;
    bubble.show(sentences[current.index].captions[caption].text);
  }

  function movePaced() {
    if (!current || current.byWord || current.pausedAt !== null) return;
    const { captions } = sentences[current.index];
    const sec = (performance.now() - current.startedAt - current.heldMs) / 1000;
    let caption = Math.max(0, current.caption);
    const dueSec = (at) => captions[at].wordsBefore / wordsPerSec - CAPTION_LEAD_SEC;
    while (caption + 1 < captions.length && dueSec(caption + 1) <= sec) caption += 1;
    showCaption(caption);
  }

  function stop() {
    clearInterval(ticker);
    ticker = null;
    current = null;
  }

  return {
    /**
     * Says `text` from its start, cutting off whatever was being said, then calls `onEnd`.
     *
     * @param {string} text
     * @param {() => void} [onEnd]
     */
    speak(text, onEnd) {
      stop();
      sentences = docentSentences(text);
      ticker = setInterval(movePaced, CAPTION_TICK_MS);
      voice.speak(
        sentences.map((sentence) => sentence.text),
        {
          onLine: (index) => {
            current = { index, caption: -1, startedAt: performance.now(), heldMs: 0, pausedAt: null, byWord: false };
            showCaption(0);
          },
          onWord: (index, charIndex) => {
            if (current?.index !== index) return;
            current.byWord = true;
            const { captions } = sentences[index];
            let caption = 0;
            while (caption + 1 < captions.length && captions[caption + 1].start <= charIndex) caption += 1;
            showCaption(caption);
          },
          // The sentence's own pace, from its words and how long they took, so the next one's captions keep up.
          onLineEnd: (index) => {
            if (current?.index !== index || current.pausedAt !== null) return;
            const sec = (performance.now() - current.startedAt - current.heldMs) / 1000;
            const words = sentences[index].text.split(/\s+/).length;
            if (words >= 4 && sec > 0.5) wordsPerSec += PACE_LEARNING * (words / sec - wordsPerSec);
          },
          onEnd: () => {
            stop();
            bubble.hideSoon();
            onEnd?.();
          },
        },
      );
    },
    /** Holds the words, and the caption, where they are. */
    pause() {
      voice.pause();
      if (current && current.pausedAt === null) current.pausedAt = performance.now();
    },
    resume() {
      voice.resume();
      if (current && current.pausedAt !== null) {
        current.heldMs += performance.now() - current.pausedAt;
        current.pausedAt = null;
      }
    },
    /** Falls silent at once, and the bubble goes. */
    cancel() {
      voice.cancel();
      stop();
      bubble.hide();
    },
    /** Whether words are being said or held. */
    get speaking() {
      return voice.speaking;
    },
  };
}
