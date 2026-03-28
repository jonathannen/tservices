interface Options {
  readonly startTime: bigint;
}

const DEFAULT_START = 1577836800000000000n; // 2020-01-01T00:00:00.000Z in nanoseconds

export type TestWallClockService = ReturnType<
  typeof createTestWallClockService
>;

/**
 * Provides a test version of the Wall Clock Service. The test version has a
 * fixed current time (by default 2020-01-01T00:00:00.000Z, but you can also
 * set in the options). This time *does not change* unless the advance method
 * is called. The advance method is only on this testing-specific
 * implementation.
 */
export const createTestWallClockService = (options?: Options) => {
  let currentTime = options?.startTime ?? DEFAULT_START;

  return {
    /**
     * Advances the current time by the specified number of nanoseconds.
     * Defaults to 1ns if no value is provided.
     */
    advance: (nanoseconds?: bigint) => {
      currentTime += nanoseconds ?? 1n;
      return currentTime;
    },

    setNow: (next: bigint) => {
      currentTime = next;
      return currentTime;
    },

    get now() {
      return currentTime;
    },
  };
};
