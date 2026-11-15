// The docent's voice: its words played from a recording where there is one (see docent-audio.js), else read aloud by
// the browser's own speech synthesis (Web Speech API), so no service is called and nothing leaves the device. It says
// one sentence at a time and draws breath between them
// (SENTENCE_GAP_SEC), which is easier to follow; one sentence at a time is steadier too, as some voices stop a long
// utterance short (Chrome's network voices after about 15 s). With no speech synthesis, it keeps the same time in
// silence, each sentence lasting as long as it would take to say.

import { SENTENCE_GAP_SEC, docentIntroSec } from '../domain/docent.js';

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

// How often a recorded sentence is checked for having reached its end (ms), so it stops there, before the next one.
const CLIP_CHECK_MS = 20;

/**
 * @typedef {Object} SpeakHandlers
 * @property {(line: number) => void} [onLine] a line begins to be said
 * @property {() => void} [onEnd] the last line has been said (not called when cut off)
 */

/**
 * @returns {{
 *   supported: boolean,
 *   speak: (lines: (string | import('./docent-audio.js').DocentLine)[], handlers?: SpeakHandlers) => void,
 *   pause: () => void,
 *   resume: () => void,
 *   cancel: () => void,
 *   setVolume: (level: number) => void,
 *   readonly speaking: boolean,
 * }}
 *   speak: says `lines` from the first, a breath between each, a line with a clip played from its recording,
 *   cutting off whatever was being said; pause and resume
 *   hold it where it is, mid-line or mid-breath; speaking: whether words are being said, breathed between or held.
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
  // A wait being kept (a breath between lines, or a silent line): what comes after it, its timer and the time left.
  let waiting = null;
  // The recordings' player, and the recorded line playing: its end check, and whether it is held (paused, perhaps
  // before it has even begun, while its file loads).
  const audio = new Audio();
  audio.preload = 'auto';
  let clip = null;
  // Each recording fetched whole into memory, by URL: played from there, a sentence can be sought to wherever it starts
  // whatever the server (one without byte ranges cannot seek), and with no wait on the network.
  const loaded = new Map();

  function load(url) {
    if (!loaded.has(url)) {
      const blob = fetch(url).then((response) => {
        if (!response.ok) throw new Error(`docent recording ${url}: ${response.status}`);
        return response.blob();
      });
      loaded.set(url, blob.then((data) => URL.createObjectURL(data)));
      // A recording that failed is fetched anew next time.
      loaded.get(url).catch(() => loaded.delete(url));
    }
    return loaded.get(url);
  }

  function stopClip() {
    if (!clip) return;
    clearInterval(clip.check);
    audio.pause();
    clip = null;
  }

  // Plays `line.clip` from its start to its end, calling `onStart` as it begins and `then` when done; if the recording
  // will not play, the line is spoken instead (`fallback`).
  function playClip({ url, startSec, endSec }, onStart, then, fallback) {
    clip = { check: null, held: false, waitingToBegin: false };
    const mine = clip;
    const finish = () => {
      if (clip !== mine) return;
      stopClip();
      then();
    };
    const fail = () => {
      if (clip !== mine) return;
      stopClip();
      fallback();
    };
    const begin = () => {
      if (clip !== mine) return;
      if (mine.held) {
        mine.waitingToBegin = true;
        return;
      }
      mine.begin = null;
      audio.currentTime = startSec;
      audio.volume = volume;
      audio.play().then(() => {
        if (clip !== mine) return;
        onStart();
        mine.check = setInterval(() => {
          if (audio.currentTime >= endSec || audio.ended) finish();
        }, CLIP_CHECK_MS);
      }, fail);
    };
    mine.begin = begin;
    load(url).then((src) => {
      if (clip !== mine) return;
      if (audio.src === src) {
        begin();
        return;
      }
      audio.src = src;
      audio.addEventListener('loadedmetadata', begin, { once: true });
      audio.addEventListener('error', fail, { once: true });
      audio.load();
    }, fail);
  }

  function wait(ms, then) {
    waiting = { then, leftMs: ms, startedAt: performance.now(), timer: setTimeout(() => {
      waiting = null;
      then();
    }, ms) };
  }

  function cancel() {
    generation += 1;
    active = false;
    if (waiting) clearTimeout(waiting.timer);
    waiting = null;
    stopClip();
    if (supported) synth.cancel();
  }

  // Says line `i`, and after a breath the next, until the last; then calls onEnd.
  function sayLine(lines, { onLine, onEnd }, mine, voice, i) {
    if (mine !== generation) return;
    if (i === lines.length) {
      active = false;
      onEnd?.();
      return;
    }
    const next = () => {
      if (mine !== generation) return;
      const after = () => sayLine(lines, { onLine, onEnd }, mine, voice, i + 1);
      if (i + 1 < lines.length) wait(SENTENCE_GAP_SEC * 1000, after);
      else after();
    };
    const line = typeof lines[i] === 'string' ? { text: lines[i] } : lines[i];
    const speakLine = () => sayAloud(line.text, () => onLine?.(i), next, mine, voice);
    if (line.clip) playClip(line.clip, () => onLine?.(i), next, speakLine);
    else speakLine();
  }

  // Says `text` with the speech synthesis (or keeps its time in silence without one), calling `onStart` as it begins
  // and `next` when done.
  function sayAloud(text, onStart, next, mine, voice) {
    if (mine !== generation) return;
    if (!supported) {
      onStart();
      wait(docentIntroSec(text) * 1000, next);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice?.lang ?? 'en-US';
    if (voice) utterance.voice = voice;
    utterance.volume = volume;
    utterance.addEventListener('start', () => {
      if (mine === generation) onStart();
    });
    utterance.addEventListener('end', next);
    utterance.addEventListener('error', next);
    synth.speak(utterance);
    // A synthesizer paused before (pause leaves it paused for the next words) would hold these too.
    synth.resume();
  }

  return {
    supported,
    speak(lines, handlers = {}) {
      cancel();
      if (!lines.length) return;
      active = true;
      sayLine(lines, handlers, generation, supported ? pickVoice(synth) : null, 0);
    },
    cancel,
    pause() {
      if (!active) return;
      if (waiting?.timer) {
        clearTimeout(waiting.timer);
        waiting.leftMs -= performance.now() - waiting.startedAt;
        waiting.timer = null;
      } else if (clip) {
        clip.held = true;
        audio.pause();
      } else if (supported) {
        synth.pause();
      }
    },
    resume() {
      if (!active) return;
      if (waiting && !waiting.timer) {
        const { then, leftMs } = waiting;
        wait(Math.max(0, leftMs), then);
      } else if (clip) {
        clip.held = false;
        if (clip.waitingToBegin) {
          clip.waitingToBegin = false;
          clip.begin();
        } else {
          audio.play().catch(() => {});
        }
      } else if (supported) {
        synth.resume();
      }
    },
    /** @param {number} level 0..1, for the lines said from now on */
    setVolume(level) {
      volume = level;
    },
    get speaking() {
      return active && (!supported || waiting !== null || clip !== null || synth.speaking || synth.pending);
    },
  };
}
