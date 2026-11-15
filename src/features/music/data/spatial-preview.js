// A short preview of the spatial audio for the onboarding: soft bell notes that circle the listener's head once and a
// half, placed by the same head-related (HRTF) panning the music uses, so earphones bring out where they come from.
//
// It starts ahead of the listener and turns clockwise, to the right first, as a dot drawn circling a head seen from
// above does. It has its own audio context, closed when it ends, so it never touches the music's mix.

// One turn round the head, and how many turns the preview takes.
const TURN_SEC = 4;
const TURNS = 1.5;
// A note every this long, up and down a major pentatonic from A4 (MIDI numbers).
const NOTE_SEC = 0.25;
const NOTES = Object.freeze([69, 71, 73, 76, 78, 81, 78, 76, 73, 71]);
// Each note's level, its decay and the distance it circles at, in panner units.
const LEVEL = 0.22;
const DECAY_SEC = 0.9;
const RADIUS = 1.6;
// The panner's position is updated this often along the circle.
const PATH_STEP_SEC = 1 / 30;

/**
 * @returns {{ turnSec: number, play: () => Promise<void>, stop: () => void }}
 *   play: starts the preview, resolving when it ends or is stopped; stop: silences it at once
 */
export function createSpatialPreview() {
  let playing = null;
  // The context the preview plays in, while it plays, and what ends its wait when it is stopped early.
  let active = null;
  let end = null;

  function play() {
    if (playing) return playing;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return Promise.resolve();
    const context = new AudioContextClass();
    active = context;
    const durationSec = TURN_SEC * TURNS;
    playing = context
      .resume()
      .then(() => {
        const start = context.currentTime + 0.05;
        const panner = new PannerNode(context, {
          panningModel: 'HRTF',
          distanceModel: 'inverse',
          refDistance: 1,
          rolloffFactor: 0.6,
          positionZ: -RADIUS,
        });
        panner.connect(context.destination);
        for (let t = 0; t <= durationSec; t += PATH_STEP_SEC) {
          const angle = (2 * Math.PI * t) / TURN_SEC;
          panner.positionX.setValueAtTime(RADIUS * Math.sin(angle), start + t);
          panner.positionZ.setValueAtTime(-RADIUS * Math.cos(angle), start + t);
        }
        const count = Math.floor(durationSec / NOTE_SEC);
        for (let i = 0; i < count; i++) bell(context, panner, NOTES[i % NOTES.length], start + i * NOTE_SEC);
        return new Promise((resolve) => {
          end = resolve;
          setTimeout(resolve, (durationSec + DECAY_SEC) * 1000);
        });
      })
      .catch((error) => console.error('spatial preview failed', error))
      .finally(() => {
        stop();
        playing = null;
      });
    return playing;
  }

  /** Silences the preview at once, if it plays; the promise play() gave then resolves. */
  function stop() {
    if (active && active.state !== 'closed') active.close().catch(() => {});
    active = null;
    end?.();
    end = null;
  }

  return { turnSec: TURN_SEC, play, stop };
}

// A soft bell: a sine with a quieter octave above, struck and dying away.
function bell(context, destination, midi, at) {
  const freq = 440 * 2 ** ((midi - 69) / 12);
  const amp = new GainNode(context, { gain: 0 });
  amp.connect(destination);
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(LEVEL, at + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + DECAY_SEC);
  for (const [ratio, level] of [[1, 1], [2, 0.25], [3.01, 0.08]]) {
    const partial = new GainNode(context, { gain: level });
    partial.connect(amp);
    const osc = new OscillatorNode(context, { type: 'sine', frequency: freq * ratio });
    osc.connect(partial);
    osc.start(at);
    osc.stop(at + DECAY_SEC + 0.05);
  }
}
