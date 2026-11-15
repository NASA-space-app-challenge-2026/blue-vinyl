// The docent's voice: its words read aloud by the browser's own speech synthesis (Web Speech API), so no service is
// called and nothing leaves the device. The words are said a sentence at a time: some voices stop a long utterance
// short (Chrome's network voices after about 15 s), and pausing between sentences is steadier too.

const LANG = 'en';

/** The sentences of `text`, each with its closing punctuation and quote. */
function sentences(text) {
  return text.match(/[^.!?]+[.!?]+["”]?\s*/g)?.map((s) => s.trim()) ?? [text];
}

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
 * @returns {{
 *   supported: boolean,
 *   speak: (text: string, onEnd: () => void) => void,
 *   pause: () => void,
 *   resume: () => void,
 *   cancel: () => void,
 *   setVolume: (level: number) => void,
 *   readonly speaking: boolean,
 * }}
 *   speak: says `text` from its start, then calls `onEnd` (not when cancelled); pause and resume hold it where it is;
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

  function cancel() {
    generation += 1;
    active = false;
    if (supported) synth.cancel();
  }

  function speak(text, onEnd) {
    cancel();
    if (!supported) return;
    const mine = generation;
    const lines = sentences(text);
    const voice = pickVoice(synth);
    active = true;
    lines.forEach((line, i) => {
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.lang = voice?.lang ?? 'en-US';
      if (voice) utterance.voice = voice;
      utterance.volume = volume;
      if (i === lines.length - 1) {
        const finish = () => {
          if (mine !== generation) return;
          active = false;
          onEnd();
        };
        utterance.addEventListener('end', finish);
        utterance.addEventListener('error', finish);
      }
      synth.speak(utterance);
    });
    // A synthesizer paused before (pause leaves it paused for the next words) would hold these too.
    synth.resume();
  }

  return {
    supported,
    speak,
    cancel,
    pause() {
      if (supported && active) synth.pause();
    },
    resume() {
      if (supported && active) synth.resume();
    },
    /** @param {number} level 0..1, for the sentences said from now on */
    setVolume(level) {
      volume = level;
    },
    get speaking() {
      return active && supported && (synth.speaking || synth.pending);
    },
  };
}
