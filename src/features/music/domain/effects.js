// The effects on the whole mix that a composer may turn (see data/mix-space.js), each with the value that leaves the
// sound as it is. The engine sets every effect back there whenever the music starts over, so an album that never
// touches them is never coloured by them.
//   REVERB: how much of the mix is sent into a large room (0 to 1);
//   ECHO: how much of the mix is sent into an echo (0 to 1) that repeats every ECHO_TIME seconds, each repeat FEEDBACK
//     of the one before.
export const Effect = Object.freeze({
  REVERB: Object.freeze({ neutral: 0 }),
  ECHO: Object.freeze({ neutral: 0 }),
  ECHO_TIME: Object.freeze({ neutral: 0.375 }),
  FEEDBACK: Object.freeze({ neutral: 0.35 }),
});
