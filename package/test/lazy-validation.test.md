# lazy validation on use

Isolated `$HOME` per test; the real config is never touched. When a package's
shared files are deleted (a genuine `pkger uninstall`), other profiles keep the
reference until they are next activated — `use` drops any ref whose files are
gone. When the files come back (a `releaser install`, which uninstalls then
reinstalls), the ref stays valid and nothing is lost.

## releaser-style reinstall keeps refs (files restored)

### should keep foo in dev after a reinstall while active=default

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev --from default >/dev/null; node ../lib/profile.mjs use dev 2>/dev/null | grep -v warning; node ../lib/profile.mjs show dev | grep "foo/bar" | wc -l | tr -d ' '
```

```expect
active profile: dev
1
```

### should keep foo runnable in dev (command fragment intact)

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev --from default >/dev/null; node ../lib/profile.mjs use dev >/dev/null 2>&1; grep '"package": "foo/bar@1.0.0"' "$HOME/.aux4.config/profiles/dev/global.aux4" | wc -l | tr -d ' '
```

```expect
2
```

## genuine uninstall is cleaned lazily on next use

### should drop the dangling foo from dev when its files are gone

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; C="$HOME/.aux4.config"; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev --from default >/dev/null; rm -rf "$C/packages/foo/bar"; node ../lib/profile.mjs use dev >/dev/null 2>&1; node ../lib/profile.mjs show dev | grep "foo/bar" | wc -l | tr -d ' '
```

```expect
0
```

### should report the dropped package

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; C="$HOME/.aux4.config"; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev --from default >/dev/null; rm -rf "$C/packages/foo/bar"; node ../lib/profile.mjs use dev 2>/dev/null | grep dropped
```

```expect
dropped missing packages: foo/bar
```

### should also remove the command fragment from global.aux4

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; C="$HOME/.aux4.config"; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev --from default >/dev/null; rm -rf "$C/packages/foo/bar"; node ../lib/profile.mjs use dev >/dev/null 2>&1; grep "foo/bar@1.0.0" "$C/profiles/dev/global.aux4" | wc -l | tr -d ' '
```

```expect
0
```

## show annotates missing refs without mutating

### should annotate a missing ref with (missing)

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; C="$HOME/.aux4.config"; node ../lib/profile.mjs init >/dev/null; rm -rf "$C/packages/foo/bar"; node ../lib/profile.mjs show | grep "foo/bar"
```

```expect
  foo/bar@1.0.0 (missing)
```

### should NOT mutate the profile on show

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; C="$HOME/.aux4.config"; node ../lib/profile.mjs init >/dev/null; rm -rf "$C/packages/foo/bar"; node ../lib/profile.mjs show >/dev/null; grep "foo/bar" "$C/profiles/default/all.json" | wc -l | tr -d ' '
```

```expect
1
```
