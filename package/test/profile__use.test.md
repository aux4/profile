# profile use

Isolated `$HOME` per test; the real config is never touched.

## switching

### should repoint the global.aux4 symlink

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs use dev >/dev/null 2>&1; readlink "$HOME/.aux4.config/global.aux4"
```

```expect
profiles/dev/global.aux4
```

### should repoint the all.json symlink

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs use dev >/dev/null 2>&1; readlink "$HOME/.aux4.config/packages/all.json"
```

```expect
../profiles/dev/all.json
```

### should warn about the daemon cache

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs use dev
```

```error:partial
restart it to apply
```

## guard

### should refuse an unknown profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs use nope
```

```error:partial
unknown profile: nope
```
