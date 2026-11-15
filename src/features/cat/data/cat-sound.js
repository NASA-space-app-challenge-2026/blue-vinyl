'use strict';

const MEOW_URL = new URL('../assets/meow.mp3', import.meta.url).href;

/**
 * Loads and plays the cat's meow sound.
 * Uses Web Audio API for zero-latency, overlapping playback, with an HTMLAudio fallback.
 */
export function createCatSound() {
  let audioContext = null;
  let audioBuffer = null;
  let loadingPromise = null;

  async function loadBuffer() {
    if (audioBuffer) return audioBuffer;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        if (!audioContext) {
          audioContext = new AudioCtx();
        }
        const response = await fetch(MEOW_URL);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
      } catch (error) {
        console.warn('Could not decode meow audio via Web Audio API, falling back to HTMLAudio:', error);
        return null;
      }
    })();

    return loadingPromise;
  }

  // Preload sound buffer quietly
  loadBuffer().catch(() => {});

  async function play() {
    try {
      const buffer = await loadBuffer();
      if (buffer && audioContext) {
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        // Subtle pitch variation for lively, natural meows on repeated taps
        const pitchVariation = 0.96 + Math.random() * 0.08;
        source.playbackRate.value = pitchVariation;
        source.connect(audioContext.destination);
        source.start(0);
        return;
      }
    } catch {
      // Fall through to HTML Audio fallback
    }

    try {
      const audio = new Audio(MEOW_URL);
      audio.playbackRate = 0.96 + Math.random() * 0.08;
      audio.play().catch(() => {});
    } catch (error) {
      console.warn('Meow audio playback failed:', error);
    }
  }

  return Object.freeze({ play });
}
