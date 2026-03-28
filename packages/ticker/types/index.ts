import type { RunstateService } from "@tservices/runstate/types";

export interface BaseTicker {
  /**
   * Registers the supplied "Tickable" interface to be run on every tick
   * cycle.
   */
  register<TResult extends TickResult>(child: Tickable<TResult>): Promise<void>;
}

/**
 * A system service that provides the ability for constantly running
 * "ticking" processes to operate. Supply a number of tick handlers
 * via register and this service will call that handler repeatedly.
 *
 * Note that TickerService is *also* a RunstateService.
 */
export interface TickerService extends BaseTicker, RunstateService {
  /**
   * Starts ticking and running the tickables.
   */
  start(): Promise<void>;

  /**
   * Stops the ticking. This will return immediately; even if ticks are
   * still being processed. This method can be called repeatedly; for
   * example if multiple process signals are received or repeated.
   */
  stop(): void;
}

export interface Tickable<TResult extends TickResult = TickResult> {
  /**
   * Optional interrupt that requests this tickable bail out (where possible)
   * of the current tick. This function should be fail-safe - it should
   * work if a tick is not running, it should also not error out of the current
   * tick. Instead it should attempt to wrap up current work and exit
   * the tick cleanly.
   */
  interrupt?(): void;

  /**
   * The tickable interface should run an execution unit.
   */
  tick(): Promise<TResult>;
}

/**
 * Metadata expected from the tick event. May be expanded, this is the
 * minimum set.
 */
export interface TickResult {
  /**
   * Number of errors encountered. This is total. Due to fanout
   * this can exceed the number of events.
   */
  readonly errorCount: number;

  /**
   * True if this tick performed work in this tick; work can be defined byt
   * the tickable itself, but generally means there were events to process,
   * or something was otherwise actioned (likely with side-effects).
   */
  readonly hasWorked: boolean;
}
