import { DateTime, type DurationLike } from "luxon";

/**
 * Creates a function that returns true at specified time intervals.
 *
 * This utility is designed to be used with ticker services to trigger events
 * at regular intervals defined by a duration.
 *
 * @param duration - A Luxon DurationLike object specifying the interval
 * @returns A function that when called:
 *   - Returns true on first call
 *   - Returns true when at least the specified duration has elapsed since the last true return
 *   - Returns false otherwise
 *
 * @example
 * // Create a trigger that fires every 5 minutes
 * const trigger = everyDuration({ minutes: 5 });
 *
 * // Use with a ticker service
 * ticker.register(() => {
 *   if (trigger()) {
 *     // This code runs every 5 minutes
 *   }
 * });
 */
export const createEveryDuration = (duration: DurationLike) => {
  let start: DateTime | undefined = undefined;
  return () => {
    if (!start) {
      start = DateTime.now();
      return true;
    }
    const next = DateTime.now();
    const shouldTrigger = next.toMillis() >= start.plus(duration).toMillis();
    if (shouldTrigger) start = next;
    return shouldTrigger;
  };
};
