// Builds the app's sound font: downloads GeneralUser GS once into .cache/ (git-ignored) and keeps only the General
// MIDI programs listed in src/features/music/domain/instruments.js, so the committed file stays small.
// Run with `npm run soundfont` after adding an instrument there.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { SoundBankLoader } from 'spessasynth_core';
import { Instrument, SOUND_FONT } from '../src/features/music/domain/instruments.js';

const SOURCE = Object.freeze({
  // GeneralUser GS v2.0.3, pinned to a commit. License: documentation/LICENSE.txt in the same repository.
  url: 'https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/684543d5e5efaef08d02be50dcda8d552478fa60/GeneralUser-GS.sf2',
  cache: new URL('../.cache/GeneralUser-GS.sf2', import.meta.url),
});
const OUTPUT = new URL(`../src/features/music/data/soundfonts/${SOUND_FONT}`, import.meta.url);

async function source() {
  if (!existsSync(SOURCE.cache)) {
    const res = await fetch(SOURCE.url);
    if (!res.ok) throw new Error(`${SOURCE.url}: HTTP ${res.status}`);
    await mkdir(new URL('.', SOURCE.cache), { recursive: true });
    await writeFile(SOURCE.cache, Buffer.from(await res.arrayBuffer()));
  }
  const file = await readFile(SOURCE.cache);
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
}

const bank = SoundBankLoader.fromArrayBuffer(await source());
const programs = new Set(Object.values(Instrument).map((inst) => inst.program));
const isKept = (p) => p.bankMSB === 0 && p.bankLSB === 0 && !p.isGMGSDrum && programs.has(p.program);
for (const preset of [...bank.presets]) if (!isKept(preset)) bank.deletePreset(preset);
bank.removeUnusedElements();
const missing = [...programs].filter((program) => !bank.presets.some((p) => p.program === program));
if (missing.length) throw new Error(`programs not in the source: ${missing.join(', ')}`);
await writeFile(OUTPUT, Buffer.from(bank.writeSF2()));
console.log(`${OUTPUT.pathname}: ${bank.presets.map((p) => `${p.program} ${p.name}`).join(', ')}`);
