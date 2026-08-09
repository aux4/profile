# profile teardown

Isolated `$HOME` per test; the real config is never touched. `teardown` reverses
the bootstrap: switch to default, then collapse the two symlinks back into flat
real files, keeping every other profile folder.

## collapsing to flat

### should turn global.aux4 back into a real file

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs teardown >/dev/null; test -L "$HOME/.aux4.config/global.aux4" && echo symlink || echo real-file
```

```expect
real-file
```

### should turn all.json back into a real file

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs teardown >/dev/null; test -L "$HOME/.aux4.config/packages/all.json" && echo symlink || echo real-file
```

```expect
real-file
```

### should keep other profile folders

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs teardown >/dev/null; test -d "$HOME/.aux4.config/profiles/dev" && echo kept
```

```expect
kept
```

### should report nothing to do on an unmigrated config

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs teardown
```

```expect
not migrated — nothing to tear down
```
