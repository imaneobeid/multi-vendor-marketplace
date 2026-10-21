// Tracks slow page-load requests, so the site can tell visitors the (free) server is waking up.
const listeners = new Set();
let slow = false;
let pending = 0;
let timer = null;

const set = (value) => {
  if (slow !== value) {
    slow = value;
    listeners.forEach((fn) => fn(slow));
  }
};

export function subscribeWake(fn) {
  listeners.add(fn);
  fn(slow);
  return () => listeners.delete(fn);
}

export function requestStarted() {
  pending++;
  if (!timer && !slow) {
    timer = setTimeout(() => {
      timer = null;
      if (pending > 0) set(true); // still waiting after 3 seconds: probably the server is waking up
    }, 3000);
  }
}

export function requestFinished() {
  pending = Math.max(0, pending - 1);
  if (pending === 0) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    set(false);
  }
}
