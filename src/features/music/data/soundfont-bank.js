import { noteName } from '../domain/pitch.js';

/**
 * General MIDI instruments rendered from the FluidR3_GM SoundFont (Frank Wen, CC BY 3.0) by
 * github.com/gleitz/midi-js-soundfonts, pinned to one commit. Each file holds one MP3 per key, A0 to C8.
 */
const SOUNDFONT_URL =
  'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@044fab8e1456bfafc5776e86dfd6bb8697149aef/FluidR3_GM/';

export const SOUNDFONT_CREDIT = 'Instruments: FluidR3_GM SoundFont (CC BY 3.0)';

const files = new Map();
const buffers = new Map();

/** Key of one decoded sample. */
export function sampleKey(instrument, midi) {
  return `${instrument}:${midi}`;
}

// The file is a script that assigns { "A0": "data:audio/mp3;base64,...", ... }; read the pairs without running it.
function instrumentFile(instrument) {
  if (!files.has(instrument)) {
    const loading = fetch(`${SOUNDFONT_URL}${instrument}-mp3.js`)
      .then((response) => {
        if (!response.ok) throw new Error(`SoundFont ${instrument}: ${response.status}`);
        return response.text();
      })
      .then((text) => new Map([...text.matchAll(/"([A-G]b?\d)":\s*"data:audio\/mp3;base64,([^"]+)"/g)].map((m) => [m[1], m[2]])));
    loading.catch(() => files.delete(instrument));
    files.set(instrument, loading);
  }
  return files.get(instrument);
}

async function decode(context, instrument, midi) {
  const file = await instrumentFile(instrument);
  const base64 = file.get(noteName(midi));
  if (!base64) throw new Error(`SoundFont ${instrument} has no ${noteName(midi)}`);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return context.decodeAudioData(bytes.buffer);
}

/**
 * Decodes the sample of every key the notes play; each instrument file is fetched and each key decoded once.
 *
 * @param {BaseAudioContext} context
 * @param {import('../domain/ice-sea-score.js').NoteEvent[]} notes
 * @returns {Promise<Map<string, AudioBuffer>>}
 */
export async function loadSamples(context, notes) {
  const keys = new Map(notes.map((n) => [sampleKey(n.instrument, n.midi), n]));
  await Promise.all(
    [...keys].map(([key, { instrument, midi }]) => {
      if (!buffers.has(key)) {
        const decoding = decode(context, instrument, midi);
        decoding.catch(() => buffers.delete(key));
        buffers.set(key, decoding);
      }
      return buffers.get(key);
    }),
  );
  const out = new Map();
  for (const key of keys.keys()) out.set(key, await buffers.get(key));
  return out;
}
