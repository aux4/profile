# profile remove

Isolated `$HOME` per test; the real config is never touched. `remove` is a
reference-only removal from the active profile — it NEVER deletes files and it
leaves other profiles untouched.

## reference-only removal

### should remove the reference from the active profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs remove foo/bar
```

```expect
removed foo/bar from default (reference only — files untouched)
```

### should leave the shared files on disk

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs remove foo/bar >/dev/null; test -d "$HOME/.aux4.config/packages/foo/bar" && echo files-kept
```

```expect
files-kept
```

### should keep the package in other profiles

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev --from default >/dev/null; node ../lib/profile.mjs remove foo/bar >/dev/null; node ../lib/profile.mjs show dev | grep "foo/bar" | wc -l | tr -d ' '
```

```expect
1
```

## guards

### should refuse an essential package

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs remove aux4/pkger
```

```error:partial
refusing to remove essential package: aux4/pkger
```

### should refuse a package not in the active profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs remove ghost/pkg
```

```error:partial
ghost/pkg is not in the active profile
```
