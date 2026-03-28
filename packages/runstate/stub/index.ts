import type { RunstateService } from "../types";

const noop = () => {};

/**
 * Creates a stub Runstate Service that does nothing — for test environments
 * where the tests are expected to clean up for themselves.
 */
export const createStubRunstateService = (): RunstateService => {
  const controller = new AbortController();

  return {
    abort: controller.signal,
    outcome: undefined,
    defer: noop,
    onDestroy: noop,
  };
};
