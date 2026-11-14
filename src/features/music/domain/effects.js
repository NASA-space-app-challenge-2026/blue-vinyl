// The effects on the whole mix, between the synthesizers and the speakers, that a composer may turn (see
// data/master-fx.js), each with the value where it leaves the sound as it is. The engine returns every effect there
// whenever the music starts over, so an album that never touches them is never coloured by them.
//   REVERB: how much of the mix is sent into a large room (0 to 1);
//   ECHO: how much of the mix is sent into the echo (0 to 1), which repeats every ECHO_TIME seconds, each repeat
//     FEEDBACK of the one before.
export const Effect = Object.freeze({
  REVERB: { neutral: 0 },
  ECHO: { neutral: 0 },
  ECHO_TIME: { neutral: 0.375 },
  FEEDBACK: { neutral: 0.35 },
});
