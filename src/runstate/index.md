# Runstate Service

Manages the lifecycle and graceful shutdown of a running process.

Direct use of `process.on('SIGTERM', ...)` or ad-hoc cleanup logic scatters
shutdown concerns across the codebase, making it hard to reason about ordering,
ensure all resources are released, and test shutdown paths. This service
centralises that by providing:

- **An abort signal** — propagates cancellation to any code that accepts an
  `AbortSignal`, so in-flight work can react to shutdown without polling.
- **Deferred promises** — allows out-of-band work (e.g. background flushes) to
  complete before the process exits.
- **Ordered destroy callbacks** — registered callbacks run in order during
  shutdown, with per-callback error handling so one failure doesn't skip the
  rest.
- **An outcome** — tracks whether shutdown completed cleanly or encountered
  errors.

## Implementations

- **nodejs** — listens for `SIGINT`/`SIGTERM` and runs destroy callbacks on
  signal. Exposes a `run()` promise that resolves when shutdown completes.
- **mock** — no-op implementation for tests where the test runner manages
  lifecycle.
