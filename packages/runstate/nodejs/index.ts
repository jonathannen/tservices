import type {
  DestroyCallback,
  RunstateOutcome,
  RunstateService,
} from "../types";

export type NodejsRunstateService = ReturnType<
  typeof createNodeRunstateService
>;

/**
 * Creates a Node.js Runstate Service that hooks into `SIGINT` and `SIGTERM`
 * to drive graceful shutdown.
 *
 * On creation, the service registers process signal listeners. When a signal
 * is received (or `destroy()` is called directly):
 *
 * 1. The abort signal is triggered, notifying any in-flight work.
 * 2. Outstanding deferrals are awaited to completion.
 * 3. Registered destroy callbacks are executed in registration order.
 * 4. Signal listeners are removed to avoid leaking handlers.
 * 5. The `run()` promise resolves with the final outcome.
 *
 * Calling `destroy()` more than once returns `"error"` immediately — shutdown
 * is not re-entrant.
 */
export const createNodeRunstateService = () => {
  const abort = new AbortController();
  let outcome: RunstateOutcome = undefined;
  let destroyed = false;
  let destroyCallbacks: DestroyCallback[] = [];
  const deferrals = new Set<Promise<unknown>>();

  let resolve: undefined | ((outcome: RunstateOutcome) => void) = undefined;
  const promise = new Promise<RunstateOutcome>((res) => {
    resolve = res;
  });

  const defer = (deferral: Promise<unknown>) => {
    deferrals.add(deferral);
    deferral
      .catch((error) => console.error(error))
      .finally(() => deferrals.delete(deferral));
  };

  const destroy = async (): Promise<RunstateOutcome> => {
    if (destroyed) return "error";
    abort.abort("Shutdown");
    destroyed = true;
    const current = destroyCallbacks;
    destroyCallbacks = [];

    // Wait out any deferrals first
    for (const deferral of deferrals)
      await deferral.catch((error) => console.error(error));

    outcome = "success";
    for (const callback of current) {
      try {
        const result = await callback();
        if (!result) outcome = "error";
      } catch (error) {
        outcome = "error";
        console.error(error);
      }
    }
    process.removeListener("SIGINT", destroy);
    process.removeListener("SIGTERM", destroy);

    if (resolve) resolve(outcome);
    return outcome;
  };

  const onDestroy = (callback: DestroyCallback): void => {
    destroyCallbacks.push(callback);
  };

  process.addListener("SIGINT", destroy);
  process.addListener("SIGTERM", destroy);

  const result = {
    abort: abort.signal,
    defer,
    destroy,
    onDestroy,
    run: () => promise,
    get outcome() {
      return outcome;
    },
  };
  return result satisfies RunstateService;
};
