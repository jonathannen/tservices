export type DestroyCallback = () => Promise<boolean>;

export type RunstateOutcome = undefined | "success" | "error";

/**
 * Interface for services for the execution runstate (e.g. cleanup operations).
 * Implements the observer pattern for destruction events.
 *
 * Note that there is no destroy! That's part of the implementation; it's
 * not expected that users of this service would or should call that.
 */
export interface RunstateService {
  readonly abort: AbortSignal;
  readonly outcome: RunstateOutcome;

  /**
   * Register a promise that will be completed before the runstate
   * exists. This is useful for promises that are expected to process
   * out-of-band of usual processing.
   */
  defer(promise: Promise<unknown>): void;

  /**
   * Registers a callback to be executed when the service is being destroyed.
   * Callbacks are executed in the order they were registered.
   *
   * @param callback - The cleanup function to execute on service destruction
   */
  onDestroy(callback: DestroyCallback): void;
}
