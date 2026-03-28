import type { Tickable } from "../types";

/**
 * Encapsulates the (albeit simple) logic around a interruptable ticker.
 * The interrupt is a method that can be passed to the ticker runtime.
 * When processing, check the running flag. If it turns false, proceed
 * to early exit any ongoing tick.
 */
export const createInterruptable = () => {
  let running = true;

  const interrupt = () => {
    running = false;
  };

  // Wraps the given tickable such that the running flag is reset to
  // true on any new tick.
  const wrap = (tickable: Tickable): Tickable => {
    const tick = () => {
      running = true;
      return tickable.tick();
    };
    return { ...tickable, interrupt, tick };
  };

  return {
    interrupt,
    isRunning: () => running,
    get running() {
      return running;
    },
    reset: () => {
      running = true;
    },
    wrap,
  };
};
