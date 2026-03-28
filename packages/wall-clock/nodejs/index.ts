import type { WallClockService } from "../types";

/**
 * Creates a Node.js version of the Wall Clock Service. This returns the
 * current wall-clock time in nanoseconds using `process.hrtime.bigint()`.
 */
export const createNode = (): WallClockService => {
  return {
    get now() {
      return process.hrtime.bigint();
    },
  };
};
