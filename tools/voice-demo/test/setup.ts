/**
 * jsdom implements no media pipeline, so `HTMLMediaElement.prototype.play`
 * throws "Not implemented" and writes a stack to stderr on every test that
 * primes the audio element.
 *
 * The widget already survives this (primeAudio wraps the call and tolerates a
 * non-promise return — which is exactly the jsdom behaviour). Stubbing it here
 * is about keeping the test output readable, not about hiding a failure: the
 * `does not log the token` test still asserts on real console output.
 */
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  writable: true,
  value: () => Promise.resolve(),
});
