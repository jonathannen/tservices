import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { Tickable } from "../types/index.ts";

const mockSetTimeout = mock.fn((_ms: number) => Promise.resolve()); // eslint-disable-line @typescript-eslint/no-unused-vars

mock.module("node:timers/promises", {
  namedExports: { setTimeout: mockSetTimeout },
});

const { createProductionTicker } = await import("./index.ts");

const getDelays = () =>
  mockSetTimeout.mock.calls.map((call) => call.arguments[0]);

describe("createProductionTicker", () => {
  beforeEach(() => {
    mockSetTimeout.mock.resetCalls();
  });

  afterEach(() => {
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  });

  it("should create a ticker with required options", () => {
    const ticker = createProductionTicker("test", {
      jitter: 0.1,
      maximumDelayMilliseconds: 5000,
      minimumDelayMilliseconds: 100,
    });

    assert.ok("start" in ticker);
    assert.ok("stop" in ticker);
    assert.ok("register" in ticker);
    assert.ok("onDestroy" in ticker);
    assert.ok("onEndTick" in ticker);
    assert.ok("onStartTick" in ticker);
    assert.ok("outcome" in ticker);
  });

  it("should start with minimum delay when work is done", async () => {
    const ticker = createProductionTicker("test", {
      jitter: 0.1,
      maximumDelayMilliseconds: 5000,
      minimumDelayMilliseconds: 100,
    });

    let tickCount = 0;
    const mockTickable: Tickable = {
      tick: async () => {
        tickCount++;
        if (tickCount >= 2) ticker.stop();
        return { errorCount: 0, hasWorked: true };
      },
    };

    await ticker.register(mockTickable);
    await ticker.start();

    const delays = getDelays();
    assert.equal(delays[0], 100);
  });

  it("should not start if no tickables are registered", async () => {
    const consoleError = mock.method(console, "error", () => {});

    const ticker = createProductionTicker("test", {
      jitter: 0.1,
      maximumDelayMilliseconds: 5000,
      minimumDelayMilliseconds: 100,
    });

    await ticker.start();

    const errorCalls = consoleError.mock.calls.map((c) => c.arguments[0]);
    assert.ok(
      errorCalls.includes(
        "Unexpected: Started ticker with no tickables. Not starting.",
      ),
    );

    consoleError.mock.restore();
  });

  it("should sleep with calculated delay after each tick", async () => {
    const ticker = createProductionTicker("test", {
      jitter: 0.1,
      maximumDelayMilliseconds: 5000,
      minimumDelayMilliseconds: 100,
    });

    let tickCount = 0;
    const mockTickable: Tickable = {
      tick: async () => {
        tickCount++;
        if (tickCount >= 3) ticker.stop();
        return { errorCount: 0, hasWorked: tickCount === 2 };
      },
    };

    await ticker.register(mockTickable);
    await ticker.start();

    const delays = getDelays();

    // First sleep: backed off because first tick had no work
    assert.ok(delays[0]! > 100);
    assert.ok(delays[0]! <= 110);

    // Second sleep: minimum because second tick had work
    assert.equal(delays[1], 100);
  });

  it("should apply exponential backoff when no work is done", async () => {
    const ticker = createProductionTicker("test", {
      jitter: 0.1,
      maximumDelayMilliseconds: 5000,
      minimumDelayMilliseconds: 100,
    });

    let tickCount = 0;
    const mockTickable: Tickable = {
      tick: async () => {
        tickCount++;
        if (tickCount >= 3) ticker.stop();
        return { errorCount: 0, hasWorked: false };
      },
    };

    await ticker.register(mockTickable);
    await ticker.start();

    assert.equal(mockSetTimeout.mock.callCount(), 2);
    const delays = getDelays();

    assert.ok(delays[0]! > 100);
    assert.ok(delays[0]! <= 110);
    assert.ok(delays[1]! > delays[0]!);
  });

  it("should reset delay to minimum when work is done", async () => {
    const ticker = createProductionTicker("test", {
      jitter: 0.1,
      maximumDelayMilliseconds: 5000,
      minimumDelayMilliseconds: 100,
    });

    let tickCount = 0;
    const mockTickable: Tickable = {
      tick: async () => {
        tickCount++;
        if (tickCount >= 4) ticker.stop();
        return { errorCount: 0, hasWorked: tickCount === 2 };
      },
    };

    await ticker.register(mockTickable);
    await ticker.start();

    const delays = getDelays();

    assert.ok(delays[0]! > 100);
    assert.ok(delays[0]! <= 110);
    assert.equal(delays[1], 100);
    assert.ok(delays[2]! > 100);
    assert.ok(delays[2]! <= 110);
  });

  it("should cap delay at maximum", async () => {
    const ticker = createProductionTicker("test", {
      jitter: 0.5,
      maximumDelayMilliseconds: 200,
      minimumDelayMilliseconds: 100,
    });

    let tickCount = 0;
    const mockTickable: Tickable = {
      tick: async () => {
        tickCount++;
        if (tickCount >= 5) ticker.stop();
        return { errorCount: 0, hasWorked: false };
      },
    };

    await ticker.register(mockTickable);
    await ticker.start();

    const delays = getDelays();

    for (const delay of delays) {
      assert.ok(delay! <= 200);
    }
  });

  it("should consider errors as work", async () => {
    const consoleError = mock.method(console, "error", () => {});

    const ticker = createProductionTicker("test", {
      jitter: 0.1,
      maximumDelayMilliseconds: 5000,
      minimumDelayMilliseconds: 100,
    });

    let tickCount = 0;
    const mockTickable: Tickable = {
      tick: async () => {
        tickCount++;
        if (tickCount >= 4) ticker.stop();
        if (tickCount === 2) throw new Error("Test error");
        return { errorCount: 0, hasWorked: false };
      },
    };

    await ticker.register(mockTickable);
    await ticker.start();

    const delays = getDelays();

    assert.ok(delays[0]! > 100);
    assert.ok(delays[0]! <= 110);
    assert.equal(delays[1], 100);
    assert.ok(delays[2]! > 100);
    assert.ok(delays[2]! <= 110);

    consoleError.mock.restore();
  });

  it("should handle multiple tickables and require all to have no work for backoff", async () => {
    const ticker = createProductionTicker("test", {
      jitter: 0.1,
      maximumDelayMilliseconds: 5000,
      minimumDelayMilliseconds: 100,
    });

    let tickCount = 0;
    const mockTickable1: Tickable = {
      tick: async () => {
        tickCount++;
        if (tickCount >= 3) ticker.stop();
        return { errorCount: 0, hasWorked: false };
      },
    };

    const mockTickable2: Tickable = {
      tick: async () => {
        return { errorCount: 0, hasWorked: true };
      },
    };

    await ticker.register(mockTickable1);
    await ticker.register(mockTickable2);
    await ticker.start();

    const delays = getDelays();

    for (const delay of delays) {
      assert.equal(delay, 100);
    }
  });

  it("should call onStartTick and onEndTick callbacks", async () => {
    const ticker = createProductionTicker("test", {
      jitter: 0.1,
      maximumDelayMilliseconds: 5000,
      minimumDelayMilliseconds: 100,
    });

    const onStartTickCallback = mock.fn(async (_tickId: string) => {}); // eslint-disable-line @typescript-eslint/no-unused-vars
    const onEndTickCallback = mock.fn(async () => {});

    ticker.onStartTick(onStartTickCallback);
    ticker.onEndTick(onEndTickCallback);

    let tickCount = 0;
    const mockTickable: Tickable = {
      tick: async () => {
        tickCount++;
        if (tickCount >= 2) ticker.stop();
        return { errorCount: 0, hasWorked: true };
      },
    };

    await ticker.register(mockTickable);
    await ticker.start();

    assert.equal(onStartTickCallback.mock.callCount(), 2);
    assert.equal(onEndTickCallback.mock.callCount(), 2);
  });

  it("should call onDestroy callbacks on stop", async () => {
    const ticker = createProductionTicker("test", {
      jitter: 0.1,
      maximumDelayMilliseconds: 5000,
      minimumDelayMilliseconds: 100,
    });

    const onDestroyCallback = mock.fn(async () => true);
    ticker.onDestroy(onDestroyCallback);

    const mockTickable: Tickable = {
      tick: async () => {
        ticker.stop();
        return { errorCount: 0, hasWorked: true };
      },
    };

    await ticker.register(mockTickable);
    await ticker.start();

    assert.equal(onDestroyCallback.mock.callCount(), 1);
    assert.equal(ticker.outcome, "success");
  });

  it("should set outcome to error if onDestroy callback returns false", async () => {
    const ticker = createProductionTicker("test", {
      jitter: 0.1,
      maximumDelayMilliseconds: 5000,
      minimumDelayMilliseconds: 100,
    });

    const onDestroyCallback = mock.fn(async () => false);
    ticker.onDestroy(onDestroyCallback);

    const mockTickable: Tickable = {
      tick: async () => {
        ticker.stop();
        return { errorCount: 0, hasWorked: true };
      },
    };

    await ticker.register(mockTickable);
    await ticker.start();

    assert.equal(ticker.outcome, "error");
  });
});
