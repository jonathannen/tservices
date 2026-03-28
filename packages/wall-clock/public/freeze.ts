import type { WallClockService } from "../types";

/**
 * Freezes the underlying Wall Clock Service; all the current time related
 * functions will return the same value.
 */
export const freezeWallClockService = (underlying: WallClockService) => {
  const current = underlying.current;
  return {
    get current() {
      return current;
    },
    get now() {
      return current.getTime();
    },
  } satisfies WallClockService;
};
