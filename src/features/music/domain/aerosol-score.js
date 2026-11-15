// The music of the aerosol album, "Connected by the Air". EIC's message for the page: "What happens in one region—whether
// natural events or human activities—can affect weather patterns and air quality thousands of miles away." So each
// track follows one event (two in Spain and Etna) from where it starts to a distant place, with the numbers of
// section 9.4 of notebooks/aerosol_album.ipynb.
//
// Every event has a motif, and every day (a bar of 8 three-hour steps) the motif is heard three ways:
//  1. Source: close, dry, on the source's side of the stereo field; louder as the air at the source thickens.
//  2. Journey: its opening imitated by up to three voices as the plume spreads (area), each later, softer and more
//     blurred than the last as it reaches farther, walking across the stereo field as the front closes on the receptor.
//  3. Arrival: the whole motif on a second instrument, on the receptor's side, as loud as the air that arrives there.
// The same melody in two places tells the listener that the two places share the air. Each particle type keeps its two
// instruments and each event its motif across the album: the Sahara's motif opens Erin and returns in Saharan Dust.
// Erin also plays the storm's own sea salt: strings that swell with the wind, timpani at its peak.

import { minorDegree, velocityGain } from './pitch.js';

export const AerosolInstrument = Object.freeze({
  GUITAR: 'acoustic_guitar_nylon',
  HARP: 'orchestral_harp',
  CELLO: 'cello',
  HORN: 'french_horn',
  CELESTA: 'celesta',
  VIBRAPHONE: 'vibraphone',
  STRINGS: 'string_ensemble_1',
  TIMPANI: 'timpani',
});

/** What a note belongs to: the particle toggle that mutes it, or the bed under every track. */
export const AerosolPart = Object.freeze({
  SALT: 'salt',
  DUST: 'dust',
  SMOKE: 'smoke',
  SULFATE: 'sulfate',
  BED: 'bed',
});

// Levels that even out the SoundFont's instruments against each other.
const MIX = Object.freeze({
  [AerosolInstrument.GUITAR]: 2.2,
  [AerosolInstrument.HARP]: 2.0,
  [AerosolInstrument.CELLO]: 2.0,
  [AerosolInstrument.HORN]: 1.6,
  [AerosolInstrument.CELESTA]: 1.6,
  [AerosolInstrument.VIBRAPHONE]: 1.6,
  [AerosolInstrument.STRINGS]: 1.8,
  [AerosolInstrument.TIMPANI]: 4.5,
});

const TONIC = 0; // C minor
const STEPS_PER_BAR = 8; // a day
// A particle type's two instruments, from its source and where it arrives, and the motif's home note on each.
const VOICES = Object.freeze({
  dust: { source: AerosolInstrument.GUITAR, arrival: AerosolInstrument.HARP, home: 60, arrivalHome: 60 },
  smoke: { source: AerosolInstrument.CELLO, arrival: AerosolInstrument.HORN, home: 48, arrivalHome: 60 },
  sulfate: { source: AerosolInstrument.CELESTA, arrival: AerosolInstrument.VIBRAPHONE, home: 72, arrivalHome: 72 },
});
// Each event's motif as [scale steps from home, beat]; a beat is an eighth of a bar's first half.
const MOTIFS = Object.freeze({
  sahara: [[0, 0], [2, 1], [4, 2], [3, 3], [1, 5]],
  'southern-africa': [[0, 0], [-1, 1], [2, 2], [1, 4]],
  spain: [[4, 0], [3, 1], [2, 2], [0, 3]],
  etna: [[0, 0], [4, 1], [2, 2], [7, 3]],
});
const ECHO_NOTES = 3; // the journey imitates the motif's opening
const MAX_ECHOES = 3;
const ARRIVAL_FLOOR = 0.2; // the arrival is silent until the receptor's AOD is this far up its range
const SIDE_PAN = 0.65;

/**
 * Builds the notes of one aerosol track, from its start.
 *
 * @param {import('../../tracks/domain/aerosol-track.js').AerosolRecord[]} records
 * @param {number} durationSec
 * @param {import('../../album/domain/album.js').Track} track
 * @returns {import('./ice-sea-score.js').NoteEvent[]}
 */
export function aerosolScore(records, durationSec, track) {
  const events = track?.aerosol?.events ?? [];
  if (!records?.length || !events.length) return [];
  const barSec = (durationSec / records.length) * STEPS_PER_BAR;
  const bars = chunk(records, STEPS_PER_BAR);

  const notes = events.flatMap((event, i) => eventNotes(event, bars, barSec, (i * barSec) / 2));
  notes.push(...(track.aerosol.trackEye ? stormNotes(bars, barSec) : bedNotes(bars.length, barSec)));

  for (const n of notes) {
    n.durationSec = Math.max(0.05, Math.min(n.durationSec, durationSec - n.timeSec - n.releaseSec));
  }
  return notes.filter((n) => n.timeSec < durationSec).sort((a, b) => a.timeSec - b.timeSec);
}

/** Source, journey and arrival of one event, a bar a day, `offsetSec` into each bar. */
function eventNotes(event, bars, barSec, offsetSec) {
  const voice = VOICES[event.particle];
  const motif = MOTIFS[event.id];
  if (!voice || !motif) return [];
  const beatSec = barSec / 16;
  const part = event.particle;

  const days = bars.map((records) => {
    const mean = (key) => average(records.map((r) => r.plumes[event.particle]?.[key] ?? 0));
    const view = records[0];
    const receptor = event.receptor ?? { lat: view.viewLat, lon: view.viewLon };
    return {
      sourceAod: mean('sourceAod'),
      receptorAod: mean('receptorAod'),
      reachKm: mean('reachKm'),
      area: mean('areaMillionKm2'),
      // How much of the way from the source the front has come, 0 to 1.
      progress: clamp01(1 - mean('frontToReceptorKm') / distanceKm(event.source, receptor)),
      sourcePan: SIDE_PAN * Math.sign(event.source.lon - receptor.lon) * (event.receptor ? 1 : 1.1),
      receptorPan: event.receptor ? -SIDE_PAN * Math.sign(event.source.lon - receptor.lon) : 0,
    };
  });
  const scale = (key) => range(days.map((d) => d[key]));
  const source = scale('sourceAod');
  const arrival = scale('receptorAod');
  const reach = scale('reachKm');
  const area = scale('area');

  const notes = [];
  days.forEach((day, b) => {
    const start = b * barSec + offsetSec;

    // 1. Source.
    const strength = source(day.sourceAod);
    const sourceGain = velocityGain(45 + 65 * strength) * MIX[voice.source];
    for (const [step, beat] of motif) {
      notes.push({
        timeSec: start + beat * beatSec,
        durationSec: beatSec * 1.6,
        instrument: voice.source,
        part,
        midi: minorDegree(voice.home, step, TONIC),
        gain: sourceGain,
        pan: day.sourcePan,
        attackSec: 0.02,
        releaseSec: 0.25,
      });
    }

    // 2. Journey: no plume, no echoes.
    const echoes = day.area > 0 ? 1 + Math.round((MAX_ECHOES - 1) * area(day.area)) : 0;
    const far = reach(day.reachKm);
    const gapSec = beatSec * (2 + 3 * far);
    for (let k = 1; k <= echoes; k++) {
      const at = start + beatSec * 4 + (k - 1) * gapSec;
      const pan = lerp(day.sourcePan, day.receptorPan, (day.progress * k) / MAX_ECHOES);
      motif.slice(0, ECHO_NOTES).forEach(([step], j) => {
        notes.push({
          timeSec: at + j * beatSec * (1 + 0.5 * far),
          durationSec: beatSec * (1.6 + k),
          instrument: voice.source,
          part,
          midi: minorDegree(voice.home, step, TONIC),
          gain: sourceGain * 0.62 ** k,
          pan,
          attackSec: 0.03 + 0.08 * k,
          releaseSec: 0.4 + 0.35 * k,
        });
      });
    }

    // 3. Arrival.
    const arrived = arrival(day.receptorAod);
    if (arrived >= ARRIVAL_FLOOR) {
      for (const [step, beat] of motif) {
        notes.push({
          timeSec: start + barSec / 2 + beat * beatSec * 1.25,
          durationSec: beatSec * 2.2,
          instrument: voice.arrival,
          part,
          midi: minorDegree(voice.arrivalHome, step, TONIC),
          gain: velocityGain(40 + 70 * arrived) * MIX[voice.arrival],
          pan: day.receptorPan,
          attackSec: 0.08,
          releaseSec: 0.6,
        });
      }
    }
  });
  return notes;
}

/** Erin's own sea salt: a C minor chord a day that swells with the salt at the eye, timpani on the windiest day. */
function stormNotes(bars, barSec) {
  const days = bars.map((records) => ({
    salt: average(records.map((r) => r.seaSalt.aod)),
    windKt: average(records.map((r) => r.erinWindKt ?? 0)),
  }));
  const salt = range(days.map((d) => d.salt));
  const peak = days.reduce((best, d, i) => (d.windKt > days[best].windKt ? i : best), 0);
  const notes = [];
  days.forEach((day, b) => {
    const start = b * barSec;
    const chord = day.windKt >= 64 ? [48, 55, 63] : [48, 55]; // a third joins once Erin is a hurricane (64 kt)
    for (const midi of chord) {
      notes.push({
        timeSec: start,
        durationSec: barSec,
        instrument: AerosolInstrument.STRINGS,
        part: AerosolPart.SALT,
        midi,
        gain: velocityGain(40 + 60 * salt(day.salt)) * MIX[AerosolInstrument.STRINGS] * 0.6,
        pan: 0,
        attackSec: 0.6,
        releaseSec: 0.9,
      });
    }
    if (b === peak) {
      for (let k = 0; k < 3; k++) {
        notes.push({
          timeSec: start + (k * barSec) / 6,
          durationSec: 1.2,
          instrument: AerosolInstrument.TIMPANI,
          part: AerosolPart.SALT,
          midi: 36,
          gain: velocityGain(100 + 7 * k) * MIX[AerosolInstrument.TIMPANI],
          pan: 0,
          attackSec: 0.002,
          releaseSec: 0.9,
        });
      }
    }
  });
  return notes;
}

/** A quiet open fifth every two days, the air the events travel through. */
function bedNotes(barCount, barSec) {
  const notes = [];
  for (let b = 0; b < barCount; b += 2) {
    for (const midi of [36, 43]) {
      notes.push({
        timeSec: b * barSec,
        durationSec: 2 * barSec,
        instrument: AerosolInstrument.STRINGS,
        part: AerosolPart.BED,
        midi,
        gain: velocityGain(42) * MIX[AerosolInstrument.STRINGS] * 0.45,
        pan: 0,
        attackSec: 0.8,
        releaseSec: 1.2,
      });
    }
  }
  return notes;
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function average(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Maps values onto 0..1 between the smallest and the largest of `values`. */
function range(values) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return (v) => (hi > lo ? (v - lo) / (hi - lo) : 0);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Great-circle distance between two points, in km. */
function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const cos = Math.sin(a.lat * rad) * Math.sin(b.lat * rad)
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lon - a.lon) * rad);
  return 6371 * Math.acos(Math.max(-1, Math.min(1, cos)));
}
