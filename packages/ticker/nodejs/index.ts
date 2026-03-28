import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import type { Tickable } from "../types";
import type {
  DestroyCallback,
  RunstateOutcome,
} from "@tservices/runstate/types";

interface Options {
  readonly jitter: number;
  readonly maximumDelayMilliseconds: number;
  readonly minimumDelayMilliseconds: number;
}

type Callback = () => Promise<unknown>;
type OnStartTickCallback = (tickId: string) => Promise<unknown>;

export type ProductionTickerService = ReturnType<typeof createProductionTicker>;

/**
 * Creates a production version of the ticker process with exponential backoff.
 *
 * This ticker implements exponential backoff with jitter when no work is being done
 * by any of the registered tickables. When work is detected, the delay resets to minimum.
 *
 * @see @tservices/ticker/types#Ticker
 */
export const createProductionTicker = (name: string, options: Options) => {
  const abort = new AbortController();
  let outcome: RunstateOutcome = undefined;
  let running = false;
  let current = options.minimumDelayMilliseconds;
  const tickables = new Set<Tickable>();
  const deferrals = new Set<Promise<unknown>>();

  const destroyCallbacks = new Set<Callback>();
  const endCallbacks = new Set<Callback>();
  const startCallbacks = new Set<OnStartTickCallback>();

  const defer = (deferral: Promise<unknown>) => {
    deferrals.add(deferral);
    deferral
      .catch((error) => console.error(error))
      .finally(() => deferrals.delete(deferral));
  };

  /**
   * Registers a callback when the ticker is being shut down.
   */
  const onDestroy = (callback: DestroyCallback) => {
    destroyCallbacks.add(callback);
  };

  /**
   * Registers an async callback at the end of each individual tick.
   */
  const onEndTick = (callback: Callback) => {
    endCallbacks.add(callback);
  };

  /**
   * Registers an async callback at the start to each individual tick.
   */
  const onStartTick = (callback: OnStartTickCallback) => {
    startCallbacks.add(callback);
  };

  const register = async (child: Tickable) => {
    tickables.add(child);
  };

  const runCallbacks = async (callbacks: Set<Callback>) => {
    if (callbacks.size === 0) return;
    for (const callback of Array.from(callbacks)) {
      try {
        await callback();
      } catch (error) {
        console.error(error);
      }
    }
  };

  /**
   * Stops all tickables - the currently running tick will complete for
   * each tickable and then gracefully exit.
   */
  const stop = (reason?: string) => {
    console.info(
      `Stopping production ticker name:${name} with reason:${reason ?? "(not-supplied)"}.`,
    );
    running = false;

    // Also ask any interruptable tickers to bail on any current tick
    for (const tickable of tickables.values())
      if (typeof tickable.interrupt === "function") tickable.interrupt();
  };

  const run = async () => {
    running = true;

    // No tickables - that's an error
    if (tickables.size === 0) {
      console.error(
        "Unexpected: Started ticker with no tickables. Not starting.",
      );
      await runCallbacks(destroyCallbacks);
      return;
    }

    while (running) {
      const tickId = randomUUID();

      // Start callbacks
      for (const callback of startCallbacks) {
        try {
          await callback(tickId);
        } catch (error) {
          console.error(error);
        }
      }

      // Tickables
      let hasWorked = false;

      for (const tickable of Array.from(tickables)) {
        try {
          const result = await tickable.tick();
          if (result.errorCount > 0)
            console.error(`Tickable produced errors - check the logs`);
          if (result.hasWorked) hasWorked = true;
        } catch (error) {
          console.error(`Error in Tickable`, error);
          // Errors count as work per the spec
          hasWorked = true;
        }
        if (!running) break;
      }

      await runCallbacks(endCallbacks);

      // Worked - reset the delay. Otherwise backoff (with a cap)
      current = hasWorked
        ? options.minimumDelayMilliseconds
        : Math.min(
            current * (1 + Math.random() * options.jitter),
            options.maximumDelayMilliseconds,
          );

      // If --expose-gc is enabled and work has been done - call the gc
      // This manual GC trigger is used to help manage memory in long-running workers.
      // It is invoked after work cycles to ensure efficient memory usage and prevent leaks.
      if (hasWorked && typeof global.gc === "function") global.gc();

      // Yields the current execution path to the event loop
      if (running) await setTimeout(current);
    }

    // Exiting - call any deferrals and optional destroy callbacks
    outcome = "success";

    for (const deferral of deferrals) {
      await deferral.catch((error) => {
        console.error(error);
        outcome = "error";
      });
    }

    abort.abort("Shutdown");
    if (destroyCallbacks.size === 0) return;
    for (const callback of destroyCallbacks) {
      try {
        const result = await callback();
        if (!result) outcome = "error";
      } catch (error) {
        outcome = "error";
        console.error(error);
      }
    }
    return outcome;
  };

  // Note that the stop function above can't really throw, so these are
  // not wrapped. If the stop was more complex this would need a try-catch
  process.addListener("SIGINT", () => stop("SIGINT"));
  process.addListener("SIGTERM", () => stop("SIGTERM"));

  return {
    abort: abort.signal,
    defer,
    onDestroy,
    onEndTick,
    onStartTick,
    register,
    start: run,
    stop,
    get outcome() {
      return outcome;
    },
  };
};
