# update cycle (uninstall → flat → reinstall → re-migrate)

Isolated `$HOME` per test; the real config is never touched. Uninstalling
`aux4/profile` (also what a `releaser` update triggers) must auto-teardown to a
genuinely FLAT config, keeping other profile folders; reinstalling then using
any profile command must re-bootstrap cleanly without clobbering them.

## self-uninstall reverts to flat

### should turn global.aux4 back into a real file

```execute
export HOME=$(mktemp -d); C="$HOME/.aux4.config"; node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create minimal >/dev/null; node ../lib/profile.mjs create prod >/dev/null; node ../lib/profile.mjs _hook-uninstall-before 'pkg=["aux4/profile"]' >/dev/null; test -L "$C/global.aux4" && echo symlink || echo real-file
```

```expect
real-file
```

### should leave no symlinks and keep the other profile folders

```execute
export HOME=$(mktemp -d); C="$HOME/.aux4.config"; node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create minimal >/dev/null; node ../lib/profile.mjs create prod >/dev/null; node ../lib/profile.mjs _hook-uninstall-before 'pkg=["aux4/profile"]' >/dev/null; echo "alljson=$(test -L "$C/packages/all.json" && echo symlink || echo real) kept=$(ls "$C/profiles" | sort | tr '\n' ',')"
```

```expect
alljson=real kept=minimal,prod,
```

## reinstall re-bootstraps without clobbering

### should re-migrate to default while keeping minimal and prod

```execute
export HOME=$(mktemp -d); C="$HOME/.aux4.config"; node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create minimal >/dev/null; node ../lib/profile.mjs create prod >/dev/null; node ../lib/profile.mjs _hook-uninstall-before 'pkg=["aux4/profile"]' >/dev/null; node ../lib/profile.mjs list >/dev/null; echo "global=$(test -L "$C/global.aux4" && echo symlink || echo real) profiles=$(ls "$C/profiles" | sort | tr '\n' ',')"
```

```expect
global=symlink profiles=default,minimal,prod,
```

### should make default active again after re-migration

```execute
export HOME=$(mktemp -d); C="$HOME/.aux4.config"; node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create minimal >/dev/null; node ../lib/profile.mjs _hook-uninstall-before 'pkg=["aux4/profile"]' >/dev/null; node ../lib/profile.mjs list
```

```expect
* default
  minimal
```

## teardown is idempotent

### should be a no-op when already flat

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs teardown >/dev/null; node ../lib/profile.mjs teardown
```

```expect
not migrated — nothing to tear down
```
