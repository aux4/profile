# profile init

Every test runs against an ISOLATED `$HOME` (`mktemp -d`) seeded with a flat
config, so the real `~/.aux4.config` is never touched.

## bootstrap

### should lay the global.aux4 symlink to profiles/default

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; readlink "$HOME/.aux4.config/global.aux4"
```

```expect
profiles/default/global.aux4
```

### should lay the all.json symlink to profiles/default

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; readlink "$HOME/.aux4.config/packages/all.json"
```

```expect
../profiles/default/all.json
```

### should keep shared package dirs in place

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs init >/dev/null; test -d "$HOME/.aux4.config/packages/foo/bar" && echo present
```

```expect
present
```

### should write a pre-profile backup

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; test -f "$HOME/.aux4.config/.global.aux4.pre-profile.bak" && echo backed-up
```

```expect
backed-up
```

### should be idempotent

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs init
```

```expect
already migrated (active: default)
```
