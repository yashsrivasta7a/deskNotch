/** Session lengths on offer, in minutes: quick ones for a small task, the
 *  classic 25, and long stretches. Stepped through with ‹ › wherever a
 *  session can be set up, so every place offers the same choices. */
export const LENGTHS = [1, 2, 5, 10, 15, 20, 25, 30, 45, 60]

/** The next length up or down from `minutes`; stays put at either end. */
export const stepLength = (minutes: number, by: 1 | -1) => {
  const at = LENGTHS.indexOf(minutes)
  // A length not on the list (older settings) steps to the nearest sensible stop.
  const from = at === -1 ? LENGTHS.findIndex((m) => m >= minutes) : at
  return LENGTHS[Math.min(LENGTHS.length - 1, Math.max(0, (from === -1 ? LENGTHS.length - 1 : from) + by))]
}
