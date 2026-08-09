# uninstall auto-teardown hook

Isolated `$HOME` per test; the real config is never touched. This drives the
`aux4:pkger/uninstall` `before` hook internal directly. (The end-to-end proof
against a real pkger is documented in the README.)

The uninstall hook does NOT prune an uninstalled package from other profiles —
that would corrupt them during `releaser install` (uninstall-then-reinstall).
Dangling refs are cleaned lazily on the next `use` (see lazy-validation.test.md).

## auto-teardown (self, before hook)

### should collapse to a flat config when aux4/profile is uninstalled

```execute
export HOME=$(mktemp -d); node ./seed.mjs; C="$HOME/.aux4.config"; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs _hook-uninstall-before 'pkg=["aux4/profile"]' >/dev/null; test -L "$C/global.aux4" && echo symlink || echo real-file
```

```expect
real-file
```

### should keep other profile folders on self-teardown

```execute
export HOME=$(mktemp -d); node ./seed.mjs; C="$HOME/.aux4.config"; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs _hook-uninstall-before 'pkg=["aux4/profile"]' >/dev/null; test -d "$C/profiles/dev" && echo kept
```

```expect
kept
```

## non-self uninstall

### should NOT prune the package from other profiles (leaves refs for lazy cleanup)

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev --from default >/dev/null; node ../lib/profile.mjs _hook-uninstall-before 'pkg=["foo/bar"]' >/dev/null; node ../lib/profile.mjs show dev | grep "foo/bar" | wc -l | tr -d ' '
```

```expect
1
```
