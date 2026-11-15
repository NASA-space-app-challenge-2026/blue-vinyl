// Dedicated multi-movement orchestral sonification for the "Connected by the Air" album.
// Every track features a distinct main instrument and communicates its own unique scientific story:
//
// 1. Hurricane Erin:
//    - Story: Cat 4/5 cyclone churning ocean water into violent sea salt spirals.
//    - Lead: Oceanic Strings ('string_ensemble_1') & Timpani ('timpani')
//    - Musical expression: Wave-like swelling chords that crescendo with wind speed (31kt -> 138kt),
//      culminating in rolling thunderous timpani at peak intensity.
//
// 2. Saharan Dust:
//    - Story: The Great Saharan Air Layer journeying across the Atlantic to the Caribbean.
//    - Lead: Warm Acoustic Guitar ('acoustic_guitar_nylon')
//    - Musical expression: Rolling desert fingerpicking arpeggios that physically pan from East
//      (right ear) to West (left ear) as dust traverses the ocean.
//
// 3. Southern Africa Smoke:
//    - Story: Vast seasonal savanna fires sending dense smoke plumes drifting over the South Atlantic.
//    - Lead: Warm Solo Cello ('cello')
//    - Musical expression: A mournful, lyrical cello lament singing an emotional C-minor melody,
//      ascending into soaring high registers as smoke density reaches global maximums.
//
// 4. Kilauea:
//    - Story: Hawaii's volcanic vents releasing a solitary, narrow stream of sulfate gas westward into the Pacific.
//    - Lead: Pure Flute ('flute') & Crystalline Chimes ('music_box')
//    - Musical expression: Ethereal, spacious, meditative woodwind phrasing with glassy chimes drifting westward.
//
// 5. Spain and Etna:
//    - Story: Iberian heatwave wildfires meeting Mt. Etna's volcanic vents across the Mediterranean.
//    - Lead: Mediterranean Oboe ('oboe') & Chamber Strings ('string_ensemble_1')
//    - Musical expression: Dramatic Mediterranean counterpoint dialogue between oboe (wildfire smoke)
//      and strings/glass (volcanic sulfate plumes).

import { minorDegree, velocityGain } from './pitch.js';

export const AerosolInstrument = Object.freeze({
  STRINGS: 'string_ensemble_1',
  CELLO: 'cello',
  GUITAR: 'acoustic_guitar_nylon',
  FLUTE: 'flute',
  OBOE: 'oboe',
  MUSIC_BOX: 'music_box',
  TIMPANI: 'timpani',
});

// SoundFont mix balancing
const MIX = Object.freeze({
  [AerosolInstrument.STRINGS]: 1.8,
  [AerosolInstrument.CELLO]: 2.0,
  [AerosolInstrument.GUITAR]: 2.2,
  [AerosolInstrument.FLUTE]: 1.8,
  [AerosolInstrument.OBOE]: 2.1,
  [AerosolInstrument.MUSIC_BOX]: 1.5,
  [AerosolInstrument.TIMPANI]: 4.5,
});

const TONIC = 0; // C natural minor

/**
 * Dispatches track to its bespoke composer.
 *
 * @param {import('../../tracks/domain/aerosol-track.js').AerosolRecord[]} records
 * @param {number} durationSec
 * @param {import('../album/domain/album.js').Track} track
 * @returns {import('./ice-sea-score.js').NoteEvent[]}
 */
export function aerosolScore(records, durationSec, track) {
  if (!records || records.length === 0) return [];

  const title = (track?.title || '').toLowerCase();
  let notes = [];

  if (title.includes('erin')) {
    notes = composeErin(records, durationSec);
  } else if (title.includes('dust')) {
    notes = composeSaharanDust(records, durationSec);
  } else if (title.includes('africa') || title.includes('smoke')) {
    notes = composeSouthernAfricaSmoke(records, durationSec);
  } else if (title.includes('kilauea')) {
    notes = composeKilauea(records, durationSec);
  } else {
    notes = composeSpainAndEtna(records, durationSec);
  }

  // Ensure no note spills over duration
  for (const n of notes) {
    n.durationSec = Math.max(0.05, Math.min(n.durationSec, durationSec - n.timeSec - (n.releaseSec || 0.1)));
  }

  return notes.sort((a, b) => a.timeSec - b.timeSec);
}

// ---------------------------------------------------------------------------
// 1. Hurricane Erin: Oceanic Strings & Climax Timpani
// ---------------------------------------------------------------------------
function composeErin(records, durationSec) {
  const notes = [];
  const stepSec = durationSec / records.length; // 0.4s

  let maxWind = 0, peakIdx = 0;
  records.forEach((r, i) => {
    if (r.erinWindKt && r.erinWindKt > maxWind) {
      maxWind = r.erinWindKt;
      peakIdx = i;
    }
  });

  for (let i = 0; i < records.length; i += 2) {
    const r = records[i];
    const timeSec = i * stepSec;
    const wind = r.erinWindKt || 35;
    const windFraction = (wind - 30) / Math.max(1, maxWind - 30); // 0..1

    if (i % 4 === 0) {
      const baseNote = 48; // C3
      const degree = Math.round(r.seaSalt.northDeg / 3.0);
      const midi = minorDegree(baseNote, degree, TONIC);
      const vel = Math.round(55 + windFraction * 45); // 55 -> 100
      notes.push({
        timeSec,
        durationSec: 1.5,
        instrument: AerosolInstrument.STRINGS,
        part: 'salt',
        midi,
        gain: velocityGain(vel) * MIX[AerosolInstrument.STRINGS],
        pan: Math.max(-0.8, Math.min(0.8, r.seaSalt.eastDeg / 30)),
        attackSec: 0.15,
        releaseSec: 0.4,
      });

      if (wind > 70) {
        notes.push({
          timeSec: timeSec + 0.1,
          durationSec: 1.3,
          instrument: AerosolInstrument.STRINGS,
          part: 'salt',
          midi: minorDegree(baseNote + 7, degree, TONIC),
          gain: velocityGain(vel - 10) * MIX[AerosolInstrument.STRINGS] * 0.7,
          pan: -Math.max(-0.8, Math.min(0.8, r.seaSalt.eastDeg / 30)),
          attackSec: 0.2,
          releaseSec: 0.4,
        });
      }
    }

    if ((i + 2) % 4 === 0 && r.dust.aod > 0.04) {
      const midi = minorDegree(60, Math.round(r.dust.northDeg / 2.5), TONIC);
      notes.push({
        timeSec,
        durationSec: 0.7,
        instrument: AerosolInstrument.GUITAR,
        part: 'dust',
        midi,
        gain: velocityGain(60) * MIX[AerosolInstrument.GUITAR] * 0.6,
        pan: Math.max(-0.85, Math.min(0.85, r.dust.eastDeg / 35)),
        attackSec: 0.03,
        releaseSec: 0.35,
      });
    }

    if (Math.abs(i - peakIdx) <= 2) {
      notes.push({
        timeSec,
        durationSec: 1.4,
        instrument: AerosolInstrument.TIMPANI,
        part: 'timpani',
        midi: 36, // C2
        gain: velocityGain(115) * MIX[AerosolInstrument.TIMPANI],
        pan: 0,
        attackSec: 0.002,
        releaseSec: 0.9,
      });
    }
  }

  return notes;
}

// ---------------------------------------------------------------------------
// 2. Saharan Dust: Transatlantic Acoustic Guitar Arpeggios
// ---------------------------------------------------------------------------
function composeSaharanDust(records, durationSec) {
  const notes = [];
  const stepSec = durationSec / records.length;

  const guitarChords = [
    [48, 55, 60, 63, 67], // Cm: C3, G3, C4, Eb4, G4
    [46, 53, 58, 62, 65], // Bb: Bb2, F3, Bb3, D4, F4
    [44, 51, 56, 60, 63], // Ab: Ab2, Eb3, Ab3, C4, Eb4
    [43, 50, 55, 58, 62], // Gm: G2, D3, G3, Bb3, D4
  ];

  for (let i = 0; i < records.length; i += 2) {
    const r = records[i];
    const timeSec = i * stepSec;
    const progress = i / records.length;

    // Physical pan glides smoothly from East (right ear, Africa) across to West (left ear, Caribbean)
    const physicalPan = Math.max(-0.85, Math.min(0.85, (0.45 - progress) * 1.6 + (r.dust.eastDeg / 40)));

    const chordIdx = Math.floor(progress * guitarChords.length) % guitarChords.length;
    const chord = guitarChords[chordIdx];
    const dustIntensity = Math.min(1.0, (r.dust.aod - 0.04) * 18); // 0..1

    // Root note
    const rootMidi = chord[0];
    notes.push({
      timeSec,
      durationSec: 0.75,
      instrument: AerosolInstrument.GUITAR,
      part: 'dust',
      midi: rootMidi,
      gain: velocityGain(60) * MIX[AerosolInstrument.GUITAR],
      pan: physicalPan * 0.5,
      attackSec: 0.03,
      releaseSec: 0.35,
    });

    const midIdx1 = 1 + ((i / 2) % (chord.length - 1));
    const midIdx2 = 1 + (((i / 2) + 2) % (chord.length - 1));
    const degreeShift = Math.round(r.dust.northDeg / 3.0);

    notes.push({
      timeSec: timeSec + 0.25,
      durationSec: 0.6,
      instrument: AerosolInstrument.GUITAR,
      part: 'dust',
      midi: minorDegree(chord[midIdx1], degreeShift, TONIC),
      gain: velocityGain(Math.round(55 + dustIntensity * 35)) * MIX[AerosolInstrument.GUITAR],
      pan: physicalPan,
      attackSec: 0.02,
      releaseSec: 0.4,
    });

    notes.push({
      timeSec: timeSec + 0.5,
      durationSec: 0.6,
      instrument: AerosolInstrument.GUITAR,
      part: 'dust',
      midi: minorDegree(chord[midIdx2], degreeShift, TONIC),
      gain: velocityGain(Math.round(50 + dustIntensity * 30)) * MIX[AerosolInstrument.GUITAR],
      pan: physicalPan,
      attackSec: 0.02,
      releaseSec: 0.4,
    });

    if (i % 8 === 0) {
      notes.push({
        timeSec,
        durationSec: 3.1,
        instrument: AerosolInstrument.STRINGS,
        part: 'salt',
        midi: 48, // C3
        gain: velocityGain(45) * MIX[AerosolInstrument.STRINGS] * 0.45,
        pan: 0,
        attackSec: 0.4,
        releaseSec: 0.7,
      });
    }
  }

  return notes;
}

// ---------------------------------------------------------------------------
// 3. Southern Africa Smoke: Melancholic Solo Cello
// ---------------------------------------------------------------------------
function composeSouthernAfricaSmoke(records, durationSec) {
  const notes = [];
  const stepSec = durationSec / records.length;

  const celloMotifs = [
    [55, 60, 63, 62], // G3, C4, Eb4, D4
    [60, 63, 67, 65], // C4, Eb4, G4, F4
    [63, 67, 72, 70], // Eb4, G4, C5, Bb4
    [65, 62, 60, 55], // F4, D4, C4, G3
  ];

  for (let i = 0; i < records.length; i += 2) {
    const r = records[i];
    const timeSec = i * stepSec;
    const smokeAod = r.smoke.aod;

    const phraseIdx = Math.floor((i / records.length) * celloMotifs.length);
    const noteInPhrase = (i / 2) % 4;
    const baseMidi = celloMotifs[phraseIdx][noteInPhrase];
    const degreeShift = Math.round(r.smoke.northDeg / 3.0);
    const midi = minorDegree(baseMidi, degreeShift, TONIC);

    const vel = Math.round(65 + Math.min(45, (smokeAod - 0.10) * 450));

    notes.push({
      timeSec,
      durationSec: 1.25,
      instrument: AerosolInstrument.CELLO,
      part: 'smoke',
      midi,
      gain: velocityGain(vel) * MIX[AerosolInstrument.CELLO],
      pan: Math.max(-0.8, Math.min(0.8, r.smoke.eastDeg / 30)),
      attackSec: 0.12,
      releaseSec: 0.35,
    });

    if (i % 8 === 0) {
      notes.push({
        timeSec,
        durationSec: 2.8,
        instrument: AerosolInstrument.CELLO,
        part: 'smoke',
        midi: 36, // C2 deep root
        gain: velocityGain(60) * MIX[AerosolInstrument.CELLO] * 0.5,
        pan: -0.2,
        attackSec: 0.25,
        releaseSec: 0.6,
      });
    }
  }

  return notes;
}

// ---------------------------------------------------------------------------
// 4. Kilauea: Ethereal Flute & Glassy Music Box
// ---------------------------------------------------------------------------
function composeKilauea(records, durationSec) {
  const notes = [];
  const stepSec = durationSec / records.length;

  const fluteNotes = [72, 75, 77, 79, 84]; // C5, Eb5, F5, G5, C6

  for (let i = 0; i < records.length; i += 4) {
    const r = records[i];
    const timeSec = i * stepSec;

    const fIdx = (Math.floor(i / 4) + Math.abs(Math.round(r.sulfate.northDeg / 2.0))) % fluteNotes.length;
    const midi = fluteNotes[fIdx];
    const vel = Math.round(65 + Math.min(35, (r.sulfate.aod - 0.02) * 1000));

    notes.push({
      timeSec,
      durationSec: 1.8,
      instrument: AerosolInstrument.FLUTE,
      part: 'sulfate',
      midi,
      gain: velocityGain(vel) * MIX[AerosolInstrument.FLUTE],
      pan: -0.45,
      attackSec: 0.18,
      releaseSec: 0.5,
    });

    if (i % 8 === 0) {
      notes.push({
        timeSec: timeSec + 0.3,
        durationSec: 2.2,
        instrument: AerosolInstrument.MUSIC_BOX,
        part: 'sulfate',
        midi: midi + 12,
        gain: velocityGain(60) * MIX[AerosolInstrument.MUSIC_BOX] * 0.7,
        pan: -0.3,
        attackSec: 0.01,
        releaseSec: 0.8,
      });
    }
  }

  return notes;
}

// ---------------------------------------------------------------------------
// 5. Spain and Etna: Mediterranean Oboe & Strings Dialogue
// ---------------------------------------------------------------------------
function composeSpainAndEtna(records, durationSec) {
  const notes = [];
  const stepSec = durationSec / records.length;

  const oboeMotif = [62, 63, 67, 65, 63, 62]; // D4, Eb4, G4, F4, Eb4, D4

  for (let i = 0; i < records.length; i += 3) {
    const r = records[i];
    const timeSec = i * stepSec;

    const oIdx = Math.floor(i / 3) % oboeMotif.length;
    const oboeMidi = minorDegree(oboeMotif[oIdx], Math.round(r.smoke.northDeg / 2.5), TONIC);
    const smokeVel = Math.round(65 + (r.smoke.aod - 0.08) * 350);

    notes.push({
      timeSec,
      durationSec: 1.1,
      instrument: AerosolInstrument.OBOE,
      part: 'smoke',
      midi: oboeMidi,
      gain: velocityGain(smokeVel) * MIX[AerosolInstrument.OBOE],
      pan: -0.35,
      attackSec: 0.08,
      releaseSec: 0.3,
    });

    if (i % 6 === 0) {
      const sulfMidi = minorDegree(55, Math.round(r.sulfate.northDeg / 2.0), TONIC);
      notes.push({
        timeSec: timeSec + 0.4,
        durationSec: 1.8,
        instrument: AerosolInstrument.STRINGS,
        part: 'sulfate',
        midi: sulfMidi,
        gain: velocityGain(60) * MIX[AerosolInstrument.STRINGS] * 0.8,
        pan: 0.45,
        attackSec: 0.15,
        releaseSec: 0.5,
      });
    }
  }

  return notes;
}
