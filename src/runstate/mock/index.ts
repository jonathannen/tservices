import type { RunstateService } from "../types";

const noop = () => {};

/**
 * Creates a mock Runstate Service that does nothing — for test environments
 * where the tests are expected to clean up for themselves.
 */
export const createMockRunstateService = (): RunstateService => {
  return {
    abort: new AbortController().signal,
    outcome: undefined,
    defer: noop,
    onDestroy: noop,
  };
};
