// Posts back every `ms` milliseconds it is sent; 0 stops it. See ticker.js.

let timer = null;

self.onmessage = ({ data: ms }) => {
  clearInterval(timer);
  timer = ms > 0 ? setInterval(() => self.postMessage(0), ms) : null;
};
