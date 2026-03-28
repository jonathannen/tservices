/**
 * Provides access to the current wall-clock time.
 */
export interface WallClockService {
  /**
   * The current system time in nanoseconds since the epoch.
   *
   * Treat this as the "current known time in this context". This value may
   * be *fixed* for scenarios like transactions or testing. Do not rely on it
   * to be monotonic.
   *
   * Whilst it is expressed in nanoseconds, do not rely on the full
   * precision being available. The may be scenarios where only millisecond
   * precision is available, or the context (preventing timing attacks)
   * means precision is not available.
   *
   * @see https://nodejs.org/api/process.html#processhrtimebigint
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
   */
  readonly now: bigint;
}
