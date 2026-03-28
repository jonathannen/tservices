import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createEveryPeriod } from "./every-period.ts";

describe("@tservices/ticker/public/every-period", () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ["Date"] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it("should work with a 10 second period supplied", () => {
    mock.timers.setTime(new Date("2020-01-01T12:00:05Z").valueOf());
    const every = createEveryPeriod({ seconds: 10 });
    const initial = every();

    mock.timers.setTime(new Date("2020-01-01T12:00:09Z").valueOf());
    const before = every();
    mock.timers.setTime(new Date("2020-01-01T12:00:10Z").valueOf());
    const equal = every();
    mock.timers.setTime(new Date("2020-01-01T12:00:11Z").valueOf());
    const after = every();
    mock.timers.setTime(new Date("2020-01-01T12:00:21Z").valueOf());
    const again = every();

    assert.equal(initial, false); // We do not trigger until the first period hits
    assert.equal(before, false); // Still not at the first period
    assert.equal(equal, true); // Exactly at the first period - TRUE
    assert.equal(after, false); // After the first period
    assert.equal(again, true); // After the second period is triggered - TRUE
  });
});
