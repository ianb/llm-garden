import { signal } from "@preact/signals";

const hashSignal = signal(location.hash);

window.addEventListener("hashchange", () => {
  hashSignal.value = window.location.hash;
});

// FIXME: with the Router in app.js and its onChange, this probably
// isn't needed:
window.addEventListener("popstate", () => {
  hashSignal.value = window.location.hash;
});

export default hashSignal;
