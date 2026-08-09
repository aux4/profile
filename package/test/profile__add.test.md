# profile add

Isolated `$HOME` per test; the real config is never touched. `add` brings an
already-installed package (present in another profile) into the active profile
as a reference — no reinstall, no file copy.

## bringing a package into the active profile

### should add a package referenced by another profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs use dev >/dev/null 2>&1; node ../lib/profile.mjs add foo/bar
```

```expect
added foo/bar to dev (from default)
```

### should make the package show up in the active profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs use dev >/dev/null 2>&1; node ../lib/profile.mjs add foo/bar >/dev/null; node ../lib/profile.mjs show | grep "foo/bar" | wc -l | tr -d ' '
```

```expect
1
```

## guards

### should refuse a package already in the active profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs add foo/bar
```

```error:partial
foo/bar is already in the active profile
```

### should refuse a package present in no profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs use dev >/dev/null 2>&1; node ../lib/profile.mjs add ghost/pkg
```

```error:partial
ghost/pkg is not present in any profile
```
