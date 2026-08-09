# real-pkger integration (CI-gated)

These tests exercise the REAL integration layer that the unit tests cannot: an
actual `aux4 aux4 pkger` install/uninstall firing the profile hooks and moving
package references through the real `.aux4` wiring.

**Self-gating:** each step SELF-SKIPS when `$CI` is unset (GitHub Actions sets
`CI=true` automatically), emitting the same `OK` token so `aux4 test run` stays
green — and safe — on a developer's machine. In CI it does real work.

**Safety:** the orchestrator (`ci-integration.mjs`) never touches the runner's
real config. It seeds a fresh temp `$HOME` by copying only the preinstalled
`aux4/aux4` + `aux4/pkger` package dirs (read-only) into it, builds and installs
the profile package there, and runs every step under that temp HOME — cleaning
it up afterward.

## install fires the hook and lands in the active profile only

### should install a throwaway into the active profile without leaking

```execute
if [ -z "$CI" ]; then echo OK; exit 0; fi
node ./ci-integration.mjs install-active-only
```

```expect
OK
```

## bare --sync propagates to every profile

### should propagate the newly-installed package to all other profiles

```execute
if [ -z "$CI" ]; then echo OK; exit 0; fi
node ./ci-integration.mjs sync-bare
```

```expect
OK
```

## --sync=<profile> targets one profile

### should propagate only to the named profile (verifies flag forwarding)

```execute
if [ -z "$CI" ]; then echo OK; exit 0; fi
node ./ci-integration.mjs sync-targeted
```

```expect
OK
```

## standalone `profile sync` with multiple targets

### should propagate to several profiles through the real .aux4 wiring

```execute
if [ -z "$CI" ]; then echo OK; exit 0; fi
node ./ci-integration.mjs standalone-sync
```

```expect
OK
```

## real uninstall is cleaned lazily on next use

### should drop the dangling reference when the profile is next activated

```execute
if [ -z "$CI" ]; then echo OK; exit 0; fi
node ./ci-integration.mjs uninstall-lazy-prune
```

```expect
OK
```

## uninstalling aux4/profile auto-tears-down to flat

### should collapse to a flat config and keep the other profile folders

```execute
if [ -z "$CI" ]; then echo OK; exit 0; fi
node ./ci-integration.mjs self-teardown
```

```expect
OK
```

## releaser-style reinstall of aux4/profile itself (PKG-096 regression)

### should survive uninstall-then-install run from the package dir without crashing

```execute
if [ -z "$CI" ]; then echo OK; exit 0; fi
node ./ci-integration.mjs releaser-reinstall
```

```expect
OK
```
