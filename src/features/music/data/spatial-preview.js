// A short preview of the spatial audio for the onboarding: one warm, bright chord, G major with an added ninth,
// circling the listener's head once, drifting nearer and further. It is placed by the same head-related (HRTF)
// panning the music uses, so earphones bring out where it is.
//
// Each note of the chord is two detuned saws, under a soft low-pass filter that opens as it plays, so the chord grows
// brighter, and breathes gently; their overtones are what let the ear place it. A long reverb gives it a space to
// sound in.
//
// It starts ahead of the listener and turns clockwise, to the right first, as a dot drawn circling a head seen from
// above does. It has its own audio context, closed when it ends, so it never touches the music's mix.

// One turn round the head, and how many turns the preview takes.
const TURN_SEC = 6;
const TURNS = 1;
// How long it swells in and fades out, and how fast Stop fades it.
const FADE_IN_SEC = 1.5;
const FADE_OUT_SEC = 2.5;
const STOP_FADE_SEC = 0.35;
// The chord's level, its notes (MIDI numbers) and how far each note's two saws are detuned.
const LEVEL = 0.4;
const NOTES = Object.freeze([55, 59, 62, 67, 69]);
const DETUNE_CENTS = 8;
// The filter: its cutoff opening from one to the other over the preview, breathing by CUTOFF_SWING_HZ at BREATH_HZ.
const CUTOFF_FROM_HZ = 900;
const CUTOFF_TO_HZ = 2600;
const CUTOFF_SWING_HZ = 300;
const BREATH_HZ = 0.3;
const RESONANCE = 1;

// The circle's radius in panner units, breathing between near and far twice a turn, and how often its position is set.
const RADIUS = 1.8;
const RADIUS_SWING = 0.7;
const PATH_STEP_SEC = 1 / 30;

// The reverb: a long decaying stereo noise tail, and how much of the chord is sent to it.
const REVERB_SEC = 4;
const WET = 0.4;

/**
 * @returns {{ turnSec: number, play: () => Promise<void>, stop: () => void }}
 *   play: starts the preview, resolving when it ends or is stopped; stop: fades it out quickly and silences it
 */
export function createSpatialPreview() {
  let playing = null;
  // While it plays: its context, its master gain, and what ends its wait when it is stopped early.
  let active = null;
  let master = null;
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
        const stopAt = start + durationSec + 0.1;

        master = new GainNode(context, { gain: 0 });
        master.connect(context.destination);
        master.gain.setValueAtTime(0, start);
        master.gain.linearRampToValueAtTime(LEVEL, start + FADE_IN_SEC);
        master.gain.setValueAtTime(LEVEL, start + durationSec - FADE_OUT_SEC);
        master.gain.linearRampToValueAtTime(0, start + durationSec);

        const reverb = new ConvolverNode(context, { buffer: impulse(context, REVERB_SEC) });
        reverb.connect(master);
        const panner = new PannerNode(context, {
          panningModel: 'HRTF',
          distanceModel: 'inverse',
          refDistance: 1,
          rolloffFactor: 0.8,
          positionZ: -RADIUS,
        });
        panner.connect(master);
        panner.connect(new GainNode(context, { gain: WET })).connect(reverb);
        for (let t = 0; t <= durationSec; t += PATH_STEP_SEC) {
          const angle = (2 * Math.PI * t) / TURN_SEC;
          const radius = RADIUS + RADIUS_SWING * Math.sin(2 * angle);
          panner.positionX.setValueAtTime(radius * Math.sin(angle), start + t);
          panner.positionZ.setValueAtTime(-radius * Math.cos(angle), start + t);
        }

        const filter = new BiquadFilterNode(context, { type: 'lowpass', frequency: CUTOFF_FROM_HZ, Q: RESONANCE });
        filter.frequency.setValueAtTime(CUTOFF_FROM_HZ, start);
        filter.frequency.exponentialRampToValueAtTime(CUTOFF_TO_HZ, start + durationSec);
        filter.connect(panner);
        const breath = new OscillatorNode(context, { frequency: BREATH_HZ });
        breath.connect(new GainNode(context, { gain: CUTOFF_SWING_HZ })).connect(filter.frequency);
        const voice = 1 / (2 * NOTES.length);
        const saws = NOTES.flatMap((midi) => [-DETUNE_CENTS, DETUNE_CENTS].map((detune) => {
          const saw = new OscillatorNode(context, { type: 'sawtooth', frequency: 440 * 2 ** ((midi - 69) / 12), detune });
          saw.connect(new GainNode(context, { gain: voice })).connect(filter);
          return saw;
        }));
        for (const node of [breath, ...saws]) {
          node.start(start);
          node.stop(stopAt);
        }

        return new Promise((resolve) => {
          end = resolve;
          setTimeout(resolve, (durationSec + 0.3) * 1000);
        });
      })
      .catch((error) => console.error('spatial preview failed', error))
      .finally(() => {
        stop();
        playing = null;
      });
    return playing;
  }

  function stop() {
    const context = active;
    if (context && context.state !== 'closed') {
      // A quick fade, not a cut, so it does not click; the context closes once it is silent.
      const now = context.currentTime;
      master?.gain.cancelScheduledValues(now);
      master?.gain.setValueAtTime(master.gain.value, now);
      master?.gain.linearRampToValueAtTime(0, now + STOP_FADE_SEC);
      setTimeout(() => context.close().catch(() => {}), (STOP_FADE_SEC + 0.05) * 1000);
    }
    active = null;
    master = null;
    end?.();
    end = null;
  }

  return { turnSec: TURN_SEC, play, stop };
}

// A stereo reverb tail: noise in each channel, decaying over `seconds`.
function impulse(context, seconds) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buffer;
}
