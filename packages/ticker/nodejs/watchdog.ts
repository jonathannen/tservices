import type { Tickable } from "../types";
import { DateTime, type DurationLike } from "luxon";

/**
 * Creates a Watchdog timer as a tickable. Unless this tickable is called
 * in a timely manner, the process is directly exited. This "timely manner"
 * is configurable as a duration and is checked every ~5 seconds.
 *
 * If interrupted, the watchdog timer will stop until it's ticked again. Thus
 * it will not stop a process in the shutdown phase.
 *
 * Note that the watchdog will always return "no work" so be mindful if
 * your ticker backoff time exceeds the watchdog period.
 *
 * Also note the watchdog is primed at creation. It should be ticked for the
 * first time before the period expires.
 *
 * @see https://en.wikipedia.org/wiki/Watchdog_timer
 */
export const createWatchdogTickable = (period: DurationLike) => {
  let running = true;
  let triggered = DateTime.now();

  setInterval(() => {
    if (!running) return; // No watchdog after being interrupted unless we're ticked again
    const current = DateTime.now(); // What we are now
    const overdue = triggered.plus(period); // When we're considered overdue

    if (current > overdue) {
      console.error(
        `[Watchdog] Watchdog Timer has exceeded expected time limit (${JSON.stringify(period)}). Exiting the process with an error.`,
      );
      process.exit(-1);
    }
  }, 5_000);

  const interrupt = () => {
    running = false;
  };

  const tick = async () => {
    // We could check the overdue status again here, but we're a little forgiving; if
    // we've managed to get to the tick then we're likely easily within the margin
    // for error.
    triggered = DateTime.now();
    running = true;
    return { errorCount: 0, hasWorked: false };
  };

  return { interrupt, tick } satisfies Tickable;
};
