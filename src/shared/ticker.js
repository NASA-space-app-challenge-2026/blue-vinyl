// Calls back every frame while the page is shown, and from a worker's timer while it is hidden: browsers stop
// animation frames in a hidden page and slow its own timers, but not a worker's, so the music keeps being scheduled.

// How often the worker calls back while the page is hidden; well inside the sound engine's lookahead.
const HIDDEN_INTERVAL_MS = 40;
const WORKER_URL = new URL('./ticker-worker.js', import.meta.url);

/** @param {(ts: number) => void} callback given the time, on the clock of performance.now() */
export function createTicker(callback) {
  let running = false;
  let frame = null;
  let worker = null;

  function onFrame(ts) {
    frame = null;
    if (!running) return;
    callback(ts);
    if (running && !document.hidden) frame = requestAnimationFrame(onFrame);
  }

  function onWorkerTick() {
    if (running && document.hidden) callback(performance.now());
  }

  // Ticks from frames or from the worker, whichever the page's visibility calls for.
  function schedule() {
    cancelAnimationFrame(frame);
    frame = null;
    worker?.postMessage(0);
    if (!running) return;
    if (!document.hidden) {
      frame = requestAnimationFrame(onFrame);
      return;
    }
    if (!worker) {
      worker = new Worker(WORKER_URL);
      worker.onmessage = onWorkerTick;
    }
    worker.postMessage(HIDDEN_INTERVAL_MS);
  }

  document.addEventListener('visibilitychange', schedule);

  return {
    start() {
      running = true;
      schedule();
    },
    stop() {
      running = false;
      schedule();
    },
  };
}
