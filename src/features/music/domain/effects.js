// The effects on the whole mix that a composer may turn (see data/master-fx.js), each with the value that leaves the
// sound as it is. The engine sets every effect back there whenever the music starts over, so an album that never
// touches them is never coloured by them.
//   REVERB: how much of the mix is sent into a large room (0 to 1);
//   ECHO: how much of the mix is sent into an echo (0 to 1) that repeats every ECHO_TIME seconds, each repeat FEEDBACK
//     of the one before;
//   LOWPASS: the cutoff (Hz) of a low-pass filter the whole mix goes through first, muffling it as it falls;
//   VOLUME: how loud the whole mix is, reverb tails and all (0 silent to 1 as it is);
//   DRIVE: how much of the mix is overdriven (0 clean to 1 all of it, pushed harder into the clipper too).
export const Effect = Object.freeze({
  REVERB: Object.freeze({ neutral: 0 }),
  ECHO: Object.freeze({ neutral: 0 }),
  ECHO_TIME: Object.freeze({ neutral: 0.375 }),
  FEEDBACK: Object.freeze({ neutral: 0.35 }),
  LOWPASS: Object.freeze({ neutral: 20000 }),
  VOLUME: Object.freeze({ neutral: 1 }),
  DRIVE: Object.freeze({ neutral: 0 }),
});
