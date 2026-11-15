'use strict';

const MEOW_URL = new URL('../assets/meow.mp3', import.meta.url).href;

/**
 * Loads and plays the cat's meow sound.
 * Guarantees synchronous playback trigger during user gesture to comply with browser autoplay policies.
 */
export function createCatSound() {
  let audioContext = null;
  let audioBuffer = null;

  // Pre-load via HTML Audio for instant availability
  const preloadedAudio = new Audio(MEOW_URL);
  preloadedAudio.preload = 'auto';
  preloadedAudio.load();

  // Also pre-fetch and decode into Web Audio buffer for smooth overlapping meows
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      fetch(MEOW_URL)
        .then((res) => res.arrayBuffer())
        .then((buf) => audioContext.decodeAudioData(buf))
        .then((decoded) => {
          audioBuffer = decoded;
        })
        .catch(() => {});
    }
  } catch {
    // AudioContext not supported or blocked
  }

  function play() {
    const pitch = 0.96 + Math.random() * 0.08;

    // If Web Audio buffer is ready and context can run, use it for zero-latency polyphony
    if (audioContext && audioBuffer) {
      try {
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = pitch;
        source.connect(audioContext.destination);
        source.start(0);
        return;
      } catch (err) {
        console.warn('Web Audio meow failed, falling back to HTML Audio:', err);
      }
    }

    // Synchronous HTML Audio fallback (always preserves User Gesture)
    try {
      const audio = new Audio(MEOW_URL);
      audio.playbackRate = pitch;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => console.warn('HTML Audio meow failed:', err));
      }
    } catch (err) {
      console.warn('Failed to play meow sound:', err);
    }
  }

  return Object.freeze({ play });
}
