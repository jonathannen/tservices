/**
 * Provides the ability to spawn child processes. Normally you would
 * use `child_process` or a library like `execa`. This service is for
 * kicking off subprocesses that need to be managed and tidied up with
 * the runstate.
 *
 * @see @tservices/runstate
 */
export interface ChildProcessService {
  start(
    cmd: string,
    args: readonly string[],
    options: ChildProcessStartOptions,
  ): Promise<ChildProcessInstance>;
}

export interface ChildProcessStartOptions {
  readonly cwd?: string;
  readonly logfile?: string;
}

export interface ChildProcessInstance {
  readonly exitCode: number;
  stop(): Promise<void>;
  terminate(): Promise<void>;
}
