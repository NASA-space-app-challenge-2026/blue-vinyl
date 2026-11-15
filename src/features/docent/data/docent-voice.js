// The docent's voice: its words read aloud by the browser's own speech synthesis (Web Speech API), so no service is
// called and nothing leaves the device. It is given its words a sentence at a time: some voices stop a long utterance
// short (Chrome's network voices after about 15 s), and pausing between sentences is steadier too. With no speech
// synthesis, it keeps the same time in silence, each sentence lasting as long as it would take to say.

import { docentIntroSec } from '../domain/docent.js';

const LANG = 'en';

// Natural-sounding English voices, best first, by a part of their name: Edge's and Windows' neural voices, Chrome's
// own, then Apple's (macOS, iOS). A name marked enhanced, premium or natural is a better recording of the same voice.
const PREFERRED = Object.freeze([
  'Microsoft Ava', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Andrew', 'Microsoft Guy',
  'Google US English', 'Google UK English Female',
  'Ava', 'Samantha', 'Allison', 'Susan', 'Zoe', 'Evan', 'Nathan', 'Tom', 'Daniel', 'Serena', 'Karen', 'Moira', 'Tessa',
]);
const RICHER = /\b(enhanced|premium|natural|neural)\b/i;
// macOS's novelty voices (singing, whispering, robots) and its old Eloquence voices, which sound mechanical.
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Fred|Good News|Jester|Junior|Kathy|Organ|Superstar|Ralph|Trinoids|Whisper|Zarvox|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/;

/** How good `voice` sounds: lower is better; Infinity for a voice never to use. */
function voiceRank(voice) {
  if (NOVELTY.test(voice.name)) return Infinity;
  const at = PREFERRED.findIndex((name) => voice.name.startsWith(name) || voice.name.includes(` ${name}`));
  const rank = at === -1 ? PREFERRED.length : at;
  // A richer recording comes before the plain one; US English before the others at the same rank.
  return rank * 4 + (RICHER.test(voice.name) ? 0 : 2) + (voice.lang.replace('_', '-') === 'en-US' ? 0 : 1);
}

/** The best-sounding English voice the browser has; null for the browser's default. */
function pickVoice(synth) {
  const english = synth.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith(LANG) && voiceRank(voice) < Infinity);
  english.sort((a, b) => voiceRank(a) - voiceRank(b));
  return english[0] ?? null;
}

/**
 * @typedef {Object} SpeakHandlers
 * @property {(line: number) => void} [onLine] a line begins to be said
 * @property {(line: number, charIndex: number) => void} [onWord] a word of it begins, where the voice reports words
 * @property {(line: number) => void} [onLineEnd] a line has been said
 * @property {() => void} [onEnd] the last line has been said (not called when cut off)
 */

/**
 * @returns {{
 *   supported: boolean,
 *   speak: (lines: string[], handlers?: SpeakHandlers) => void,
 *   pause: () => void,
 *   resume: () => void,
 *   cancel: () => void,
 *   setVolume: (level: number) => void,
 *   readonly speaking: boolean,
 * }}
 *   speak: says `lines` from the first, cutting off whatever was being said; pause and resume hold it where it is;
 *   speaking: whether words are being said or held.
 */
export function createDocentVoice() {
  const synth = globalThis.speechSynthesis;
  const supported = Boolean(synth && globalThis.SpeechSynthesisUtterance);
  // Chrome loads its voices only when first asked, and lists none until then: asked now, they are there to choose from
  // by the time the docent first speaks, rather than the browser's default (which may not even be English).
  if (supported) synth.getVoices();
  // Counts each speak and cancel, so the callbacks of words cut off are ignored.
  let generation = 0;
  let active = false;
  let volume = 1;
  // Without speech synthesis: the silent line being kept, its timer and the time left of it.
  let silent = null;

  function cancel() {
    generation += 1;
    active = false;
    if (silent) clearTimeout(silent.timer);
    silent = null;
    if (supported) synth.cancel();
  }

  function speakAloud(lines, { onLine, onWord, onLineEnd, onEnd }, mine) {
    const voice = pickVoice(synth);
    lines.forEach((line, i) => {
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.lang = voice?.lang ?? 'en-US';
      if (voice) utterance.voice = voice;
      utterance.volume = volume;
      utterance.addEventListener('start', () => {
        if (mine === generation) onLine?.(i);
      });
      utterance.addEventListener('boundary', (event) => {
        if (mine === generation && event.name === 'word') onWord?.(i, event.charIndex);
      });
      utterance.addEventListener('end', () => {
        if (mine === generation) onLineEnd?.(i);
      });
      if (i === lines.length - 1) {
        const finish = () => {
          if (mine !== generation) return;
          active = false;
          onEnd?.();
        };
        utterance.addEventListener('end', finish);
        utterance.addEventListener('error', finish);
      }
      synth.speak(utterance);
    });
    // A synthesizer paused before (pause leaves it paused for the next words) would hold these too.
    synth.resume();
  }

  // Keeps each line's time in silence, one after another.
  function speakSilently(lines, { onLine, onEnd }, mine, i = 0) {
    if (mine !== generation) return;
    if (i === lines.length) {
      active = false;
      silent = null;
      onEnd?.();
      return;
    }
    onLine?.(i);
    const next = () => speakSilently(lines, { onLine, onEnd }, mine, i + 1);
    const leftMs = docentIntroSec(lines[i]) * 1000;
    silent = { next, leftMs, startedAt: performance.now(), timer: setTimeout(next, leftMs) };
  }

  return {
    supported,
    speak(lines, handlers = {}) {
      cancel();
      if (!lines.length) return;
      active = true;
      if (supported) speakAloud(lines, handlers, generation);
      else speakSilently(lines, handlers, generation);
    },
    cancel,
    pause() {
      if (!active) return;
      if (supported) synth.pause();
      else if (silent?.timer) {
        clearTimeout(silent.timer);
        silent.leftMs -= performance.now() - silent.startedAt;
        silent.timer = null;
      }
    },
    resume() {
      if (!active) return;
      if (supported) synth.resume();
      else if (silent && !silent.timer) {
        silent.startedAt = performance.now();
        silent.timer = setTimeout(silent.next, Math.max(0, silent.leftMs));
      }
    },
    /** @param {number} level 0..1, for the lines said from now on */
    setVolume(level) {
      volume = level;
    },
    get speaking() {
      return active && (!supported || synth.speaking || synth.pending);
    },
  };
}
