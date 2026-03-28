import type { DestroyCallback, RunstateOutcome } from "../types";

/**
 * Creates a local implementation of Runstate Service that manages destroy callbacks
 * for service cleanup operations.
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
    if (resolve) resolve(outcome);
    return outcome;
  };

  const onDestroy = (callback: DestroyCallback): void => {
    destroyCallbacks.push(callback);
  };

  process.addListener("SIGINT", destroy);
  process.addListener("SIGTERM", destroy);

  return {
    abort: abort.signal,
    defer,
    destroy,
    onDestroy,
    run: () => promise,
    get outcome() {
      return outcome;
    },
  };
};
