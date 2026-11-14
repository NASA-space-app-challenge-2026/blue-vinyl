// Builds the app's sound font: downloads GeneralUser GS once into .cache/ (git-ignored) and keeps only the General
// MIDI programs listed in src/features/music/domain/instruments.js, so the committed file stays small. GeneralUser GS
// has no gong, so one is added from VSCO 2 Community Edition (see GONG).
// Run with `npm run soundfont` after adding an instrument there.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { BasicInstrument, BasicPreset, EmptySample, GeneratorTypes, SoundBankLoader } from 'spessasynth_core';
import { Instrument, SOUND_FONT } from '../src/features/music/domain/instruments.js';

const SOURCE = Object.freeze({
  // GeneralUser GS v2.0.3, pinned to a commit. License: documentation/LICENSE.txt in the same repository.
  url: 'https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/684543d5e5efaef08d02be50dcda8d552478fa60/GeneralUser-GS.sf2',
  cache: new URL('../.cache/GeneralUser-GS.sf2', import.meta.url),
});
// A gong struck fortissimo, from VSCO 2 Community Edition (CC0), pinned to a commit: 16-bit stereo PCM WAV, mixed to
// mono, its silence before the stroke cut, kept for `keepSec`, faded out over the last `fadeSec` and raised to `peak`
// (the recording peaks at half scale). It plays at its own pitch on `rootKey`, and rings on for `releaseSec` after its
// note ends.
const GONG = Object.freeze({
  url: 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Percussion/gongHit_fff.wav',
  cache: new URL('../.cache/vsco2-gongHit_fff.wav', import.meta.url),
  name: 'Gong',
  keepSec: 12,
  fadeSec: 4,
  onsetLevel: 0.02,
  peak: 0.98,
  rootKey: 60,
  releaseSec: 2,
});
const OUTPUT = new URL(`../src/features/music/data/soundfonts/${SOUND_FONT}`, import.meta.url);

async function download({ url, cache }) {
  if (!existsSync(cache)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    await mkdir(new URL('.', cache), { recursive: true });
    await writeFile(cache, Buffer.from(await res.arrayBuffer()));
  }
  const file = await readFile(cache);
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
}

// A 16-bit PCM WAV as mono samples (-1..1) and its sample rate.
function readWav(buffer) {
  const view = new DataView(buffer);
  let format = null;
  for (let at = 12; at + 8 <= view.byteLength; ) {
    const id = String.fromCharCode(...new Uint8Array(buffer, at, 4));
    const size = view.getUint32(at + 4, true);
    const body = at + 8;
    if (id === 'fmt ') {
      format = { channels: view.getUint16(body + 2, true), rate: view.getUint32(body + 4, true), bits: view.getUint16(body + 14, true) };
    } else if (id === 'data') {
      if (!format || format.bits !== 16) throw new Error('gong: expected 16-bit PCM');
      const frames = Math.floor(size / (2 * format.channels));
      const mono = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < format.channels; c++) sum += view.getInt16(body + 2 * (i * format.channels + c), true);
        mono[i] = sum / format.channels / 32768;
      }
      return { data: mono, rate: format.rate };
    }
    at = body + size + (size % 2);
  }
  throw new Error('gong: no data chunk');
}

function gongSample() {
  return download(GONG).then((buffer) => {
    const { data, rate } = readWav(buffer);
    const onset = data.findIndex((v) => Math.abs(v) >= GONG.onsetLevel);
    const kept = data.slice(onset, onset + GONG.keepSec * rate);
    const fade = GONG.fadeSec * rate;
    for (let i = 0; i < fade; i++) kept[kept.length - 1 - i] *= i / fade;
    const gain = GONG.peak / kept.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
    return { data: kept.map((v) => v * gain), rate };
  });
}

// Adds the gong as the program of Instrument.GONG.
async function addGong(bank) {
  const { data, rate } = await gongSample();
  const sample = new EmptySample();
  sample.name = GONG.name;
  sample.originalKey = GONG.rootKey;
  sample.setAudioData(data, rate);
  bank.addSamples(sample);
  const instrument = new BasicInstrument();
  instrument.name = GONG.name;
  const zone = instrument.createZone(sample);
  zone.setGenerator(GeneratorTypes.releaseVolEnv, Math.round(1200 * Math.log2(GONG.releaseSec)));
  bank.addInstruments(instrument);
  const preset = new BasicPreset(bank);
  preset.name = GONG.name;
  preset.program = Instrument.GONG.program;
  preset.createZone(instrument);
  bank.addPresets(preset);
}

const bank = SoundBankLoader.fromArrayBuffer(await download(SOURCE));
// Melodic programs and drum kits are numbered apart: kit 16 (Power) is not program 16 (an organ). The gong's program is
// not kept from the source: the gong takes it (addGong).
const fromSource = Object.values(Instrument).filter((inst) => inst !== Instrument.GONG);
const programsOf = (drums) => new Set(fromSource.filter((inst) => Boolean(inst.drums) === drums).map((inst) => inst.program));
const programs = { melodic: programsOf(false), drums: programsOf(true) };
const isKept = (p) => p.bankMSB === 0 && p.bankLSB === 0 && (p.isGMGSDrum ? programs.drums : programs.melodic).has(p.program);
for (const preset of [...bank.presets]) if (!isKept(preset)) bank.deletePreset(preset);
bank.removeUnusedElements();
await addGong(bank);
const missing = Object.values(Instrument).filter(
  (inst) => !bank.presets.some((p) => p.program === inst.program && p.isGMGSDrum === Boolean(inst.drums)),
);
if (missing.length) throw new Error(`programs not in the source: ${missing.map((inst) => inst.program).join(', ')}`);
await writeFile(OUTPUT, Buffer.from(bank.writeSF2()));
console.log(`${OUTPUT.pathname}: ${bank.presets.map((p) => `${p.program} ${p.name}`).join(', ')}`);
