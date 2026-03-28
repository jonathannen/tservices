import type { Tickable } from "../types";

interface Dependencies {
  readonly configuration: {
    isCurrentEnv(...envs: string[]): boolean;
  };
}

/**
 * Creates a tickable that is a no-op. This is only valid in test and local
 * environments.
 *
 * @see @tservices/ticker/types#Ticker
 */
export const createNoopTickable = (dependencies: Dependencies) => {
  if (!dependencies.configuration.isCurrentEnv("test", "local"))
    throw new Error(
      `Cannot create a noop-tickable outside of test and local environments.`,
    );

  const result = Promise.resolve({ errorCount: 0, hasWorked: false });
  return {
    tick: () => result,
  } satisfies Tickable;
};
