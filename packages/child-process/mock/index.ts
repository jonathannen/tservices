import type {
  ChildProcessInstance,
  ChildProcessService,
  ChildProcessStartOptions,
} from "../types";

export interface MockChildProcessCall {
  readonly cmd: string;
  readonly args: readonly string[];
  readonly options: ChildProcessStartOptions;
  readonly instance: MockChildProcessInstance;
}

export interface MockChildProcessInstance extends ChildProcessInstance {
  /** Simulate the process exiting with the given code. */
  simulateExit(code: number): void;
}

/**
 * Creates a mock version of the Child Process Service for testing.
 */
export const createTestChildProcessService = () => {
  const calls: MockChildProcessCall[] = [];

  const service: ChildProcessService = {
    async start(
      cmd: string,
      args: readonly string[],
      options: ChildProcessStartOptions,
    ): Promise<ChildProcessInstance> {
      let exitCode = -1;

      const instance: MockChildProcessInstance = {
        get exitCode() {
          return exitCode;
        },

        simulateExit(code: number) {
          exitCode = code;
        },

        async stop() {
          if (exitCode !== -1) return;
          instance.simulateExit(0);
        },

        async terminate() {
          if (exitCode !== -1) return;
          instance.simulateExit(137);
        },
      };

      calls.push({ cmd, args, options, instance });
      return instance;
    },
  };

  return { ...service, calls };
};
