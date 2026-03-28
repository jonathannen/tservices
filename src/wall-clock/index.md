# Wall Clock Service

Provides access to the current wall-clock time as nanoseconds since the epoch.

Calling `Date.now()` or `new Date()` directly couples your code to the runtime
clock, which makes it difficult to test time-dependent logic deterministically
and impossible to guarantee consistent timestamps within a single operation.
This service abstracts that dependency so that:

- **Tests are deterministic** — swap in the mock implementation and advance time
  explicitly, rather than relying on real clock progression or fragile sleeps.
- **Transactions see a consistent "now"** — freeze the clock for the duration of
  an operation so that all timestamps within it agree, avoiding subtle ordering
  bugs.
- **Timing-sensitive contexts are controllable** — precision can be intentionally
  reduced (e.g. to prevent timing side-channel attacks) without changing
  consuming code.

The value returned by `now` represents the "current known time in this context"
rather than a guaranteed real-time source. It may be fixed during transactions
or testing, and precision may be reduced (e.g. to milliseconds) depending on the
environment.

## Implementations

- **nodejs** — live wall-clock time via `process.hrtime.bigint()`
- **mock** — fixed time starting at 2020-01-01, advanceable for tests
