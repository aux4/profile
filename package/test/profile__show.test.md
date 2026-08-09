# profile show

Isolated `$HOME` per test; the real config is never touched.

## default target

### should show the active profile when no name is given

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs show | grep "active"
```

```expect:partial
profile default (active): * packages
```

### should list the active profile packages

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs show | grep "foo/bar"
```

```expect
  foo/bar@1.0.0
```

## named target

### should show a named profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs show dev | grep "packages"
```

```expect
profile dev: 3 packages
```

### should refuse an unknown profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs show nope
```

```error:partial
unknown profile: nope
```
