import type { Tickable } from "../types";
import type {
  DestroyCallback,
  RunstateOutcome,
} from "@tservices/runstate/types";

type Callback = () => Promise<unknown>;

export type LocalTickerService = ReturnType<typeof createTestTicker>;

/**
 * Creates a unit test version of the ticker process.
 * * @see @tservices/ticker/types#Ticker
 */
export const createTestTicker = () => {
  const abort = new AbortController();
  let outcome: RunstateOutcome = undefined;
  const tickables = new Set<Tickable>();
  const deferrals = new Set<Promise<unknown>>();

  const destroyCallbacks = new Set<Callback>();

  const defer = (deferral: Promise<unknown>) => {
    deferrals.add(deferral);
    deferral
      .catch((error) => console.error(error))
      .finally(() => deferrals.delete(deferral));
  };

  const onDestroy = (callback: DestroyCallback) => {
    destroyCallbacks.add(callback);
  };

  const register = async (child: Tickable) => {
    tickables.add(child);
  };

  const tick = async () => {
    if (tickables.size === 0) return false;
    let hasWorked = false;
    for (const tickable of tickables) {
      const result = await tickable.tick();
      if (result.errorCount > 0) throw new Error(`Error in Tickable`);
      hasWorked = hasWorked || result.hasWorked;
    }
    return hasWorked;
  };

  // Runs the reactor until the tickers reaches steady state
  const tickAll = async () => {
    let count = 0;
    while (true) {
      const hasWorked = await tick();
      if (!hasWorked) break;
      count++;
      if (count > 100)
        throw new Error(`Suspect infinite loop in reactor event processing?`);
    }
    return { count, hasWorked: count > 0 };
  };

  const destroy = async () => {
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
  };

  return {
    abort: abort.signal,
    defer,
    destroy,
    onDestroy,
    register,
    tick,
    tickAll,
    get outcome() {
      return outcome;
    },
  };
};
