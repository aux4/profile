# profile sync

Isolated `$HOME` per test; the real config is never touched. `sync` propagates a
package's reference from the active profile into other profiles — add reference
only, no reinstall.

## propagate to all

### should sync the package into every other profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs create qa >/dev/null; node ../lib/profile.mjs sync foo/bar '["all"]'
```

```expect:partial
synced foo/bar to: **
```

### should make the package appear in a synced target

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs sync foo/bar '["all"]' >/dev/null; node ../lib/profile.mjs show dev | grep "foo/bar" | wc -l | tr -d ' '
```

```expect
1
```

## propagate to a named target

### should sync into ONLY the named profile — via the positional JSON array the .aux4 sends (values(to*)), with a second profile present so targeted differs from all

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs create qa >/dev/null; node ../lib/profile.mjs sync foo/bar '["dev"]'
```

```expect
synced foo/bar to: dev
```

### should NOT touch the non-targeted profile (qa stays without foo/bar)

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs create qa >/dev/null; node ../lib/profile.mjs sync foo/bar '["dev"]' >/dev/null; node ../lib/profile.mjs show qa | grep "foo/bar" | wc -l | tr -d ' '
```

```expect
0
```

### should sync into multiple named targets via positional JSON array

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs create qa >/dev/null; node ../lib/profile.mjs create stg >/dev/null; node ../lib/profile.mjs sync foo/bar '["dev","qa"]'
```

```expect
synced foo/bar to: dev, qa
```

## guards

### should refuse a package missing from the active profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs sync ghost/pkg --to dev
```

```error:partial
ghost/pkg is not in the active profile
```

### should refuse an unknown target profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs sync foo/bar --to nope
```

```error:partial
unknown target profile: nope
```
