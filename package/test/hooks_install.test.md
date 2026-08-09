# install --sync hook

Isolated `$HOME` per test; the real config is never touched. These tests drive
the `aux4:pkger/install` `before`/`after` hook internals directly and simulate
what `pkger install` does to the active profile with `fake-install.mjs`. The
`--sync` targets are passed exactly as aux4 renders `values(sync*)` — a bare
JSON-array string:

- bare `--sync` / `--sync=true` render as `["true"]` → all other profiles
- `--sync=<profile>` renders as `["<profile>"]` → that profile
- no flag renders as `[]` → no-op (active only)

These tests do NOT invoke a real `pkger`; they call the hook internals
(`_hook-install-before` / `_hook-install-after`) directly and stand in for the
install with `fake-install.mjs`, so they validate the propagation LOGIC only.
The real hook-scope proof — that an actual `aux4 aux4 pkger install foo --sync`
exposes `values(sync*)` to the after hook — lives in `integration.test.md`
(CI-gated) and is documented in the README.

## --sync (bare / true) means all profiles

### should propagate the newly-installed package to every profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs create qa >/dev/null; node ../lib/profile.mjs _hook-install-before; node ./fake-install.mjs foo/bar; node ../lib/profile.mjs _hook-install-after '["true"]' >/dev/null; echo "$(node ../lib/profile.mjs show dev | grep -c foo/bar)$(node ../lib/profile.mjs show qa | grep -c foo/bar)"
```

```expect
11
```

## --sync=<profile> targets that profile

### should propagate only to the named profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs create qa >/dev/null; node ../lib/profile.mjs _hook-install-before; node ./fake-install.mjs foo/bar; node ../lib/profile.mjs _hook-install-after '["dev"]' >/dev/null; echo "$(node ../lib/profile.mjs show dev | grep -c foo/bar)$(node ../lib/profile.mjs show qa | grep -c foo/bar)"
```

```expect
10
```

## multiple target names (logic)

### should propagate to each named profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs create qa >/dev/null; node ../lib/profile.mjs _hook-install-before; node ./fake-install.mjs foo/bar; node ../lib/profile.mjs _hook-install-after '["dev","qa"]' >/dev/null; echo "$(node ../lib/profile.mjs show dev | grep -c foo/bar)$(node ../lib/profile.mjs show qa | grep -c foo/bar)"
```

```expect
11
```

## no --sync

### should leave other profiles untouched

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs _hook-install-before; node ./fake-install.mjs foo/bar; node ../lib/profile.mjs _hook-install-after '[]' >/dev/null; node ../lib/profile.mjs show dev | grep foo/bar | wc -l | tr -d ' '
```

```expect
0
```

### should report what it synced

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs _hook-install-before; node ./fake-install.mjs foo/bar; node ../lib/profile.mjs _hook-install-after '["true"]'
```

```expect:partial
synced foo/bar -> dev
```

### should not leave a snapshot file behind

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs _hook-install-before; node ./fake-install.mjs foo/bar; node ../lib/profile.mjs _hook-install-after '["true"]' >/dev/null; test -f "$HOME/.aux4.config/.profile.install-snapshot.json" && echo litter || echo clean
```

```expect
clean
```
