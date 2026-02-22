# Test Layout

This directory is organized by intent:

- `test/runners`: aggregate runners (`npm test` entrypoint)
- `test/suites`: automated suites by domain (`core`, `runtime`, `cli`, `integration`)
- `test/support`: shared helpers (`runTestSuite`, assertions, timers)
- `test/fixtures`: `.if` fixtures, import fixtures, compiled JSON, and story source modules
- `test/harness`: browser/manual harness scripts and debug helpers
- `test/assets`: test-only static assets

## Canonical Scripts

- `npm test` -> `test/runners/run-all-tests.mjs`
- `npm run test:core:*` -> core parser/runtime suites
- `npm run test:runtime:*` -> runtime-specific suites
- `npm run test:cli:check` -> CLI diagnostics suite
- `npm run test:integration:import` -> import integration suite
- `npm run test:harness:*` -> manual harness node entrypoints

## Quarantine Note

`test:integration:import` is currently non-gating and intentionally excluded from `npm test` while alias-path resolution behavior is stabilized. This suite may report a known failure for the `@imports/...` alias case.
