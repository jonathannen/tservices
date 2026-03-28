import type { Tickable } from "../types";
import { DateTime, Duration, type DurationLike } from "luxon";

/**
 * This operates much like everyDuration in this package. However,
 * rather than operating on a duration over any starting point, it works
 * on "nearest" roundings of the duration. So if you supplied
 * "10 seconds" as the period it would trigger at 00/10/20/etc seconds
 * every minute.
 *
 * @see every-duration.ts
 */

const floor = (dt: DateTime, duration: Duration): number => {
  const ms = dt.toMillis();
  const durationMilliseconds = duration.toMillis();
  return Math.floor(ms / durationMilliseconds) * durationMilliseconds;
};

export const createEveryPeriod = (period: DurationLike) => {
  let last = DateTime.now().toMillis();
  const duration = Duration.fromDurationLike(period);

  return () => {
    const next = floor(DateTime.now(), duration);
    if (next <= last) return false; // Not triggered
    last = next;
    return true;
  };
};

export const wrapEveryPeriod = <TTickable extends Tickable>(
  period: DurationLike,
  tickable: TTickable,
): TTickable => {
  let every: (() => boolean) | undefined = undefined;

  const tick = async () => {
    if (every === undefined) {
      every = period === 0 ? () => true : createEveryPeriod(period);
      return await tickable.tick();
    }

    if (!every()) return { errorCount: 0, hasWorked: false };
    return await tickable.tick();
  };
  return { ...tickable, tick };
};
