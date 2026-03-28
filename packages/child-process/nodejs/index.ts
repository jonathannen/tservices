import { spawn } from "node:child_process";
import { open } from "node:fs/promises";
import type { RunstateService } from "@tservices/runstate/types";
import type {
  ChildProcessInstance,
  ChildProcessService,
  ChildProcessStartOptions,
} from "../types";

interface Dependencies {
  readonly runstate: RunstateService;
}

/**
 * Creates a Node.js version of the Child Process Service.
 *
 * Registers an onDestroy callback with the runstate so that all
 * spawned child processes are stopped during shutdown.
 */
export const createNodejsChildProcessService = (
  dependencies: Dependencies,
): ChildProcessService => {
  const { runstate } = dependencies;
  const instances = new Set<ChildProcessInstance>();

  runstate.onDestroy(async () => {
    await Promise.all(Array.from(instances).map((instance) => instance.stop()));
    return true;
  });

  const start = async (
    cmd: string,
    args: readonly string[],
    options: ChildProcessStartOptions,
  ): Promise<ChildProcessInstance> => {
    const logHandle = options.logfile
      ? await open(options.logfile, "a")
      : undefined;
    const logStream = logHandle?.createWriteStream();

    let child;
    try {
      child = spawn(cmd, args, {
        cwd: options.cwd,
        detached: true,
        stdio: ["ignore", logStream ?? "ignore", logStream ?? "ignore"],
      });
    } catch (error) {
      logStream?.end();
      await logHandle?.close();
      throw error;
    }

    let exitCode = -1;

    const kill = (signal: NodeJS.Signals): Promise<void> => {
      if (child.exitCode !== null) return Promise.resolve();
      const { promise, resolve } = Promise.withResolvers<void>();
      child.once("exit", () => resolve());
      try {
        process.kill(-child.pid!, signal);
      } catch {
        resolve();
      }
      return promise;
    };

    const stop = () => kill("SIGTERM");
    const terminate = () => kill("SIGKILL");

    const instance: ChildProcessInstance = {
      get exitCode() {
        return exitCode;
      },
      stop,
      terminate,
    };

    instances.add(instance);

    child.on("exit", (code) => {
      exitCode = code ?? 1;
      instances.delete(instance);
      logStream?.end();
      logHandle?.close();
    });

    return instance;
  };

  return { start };
};
