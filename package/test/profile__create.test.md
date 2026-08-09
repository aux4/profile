# profile create

Every test runs against an ISOLATED `$HOME` (a fresh `mktemp -d`) seeded with a
flat aux4 config, so the real `~/.aux4.config` is never touched. The commands are
invoked directly as `node ../lib/profile.mjs` because an isolated HOME has no
installed `aux4 profile` command.

## minimal create

### should seed only the essentials

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs create dev
```

```expect
created minimal profile dev (aux4/aux4, aux4/pkger, aux4/profile)
```

### should NOT include non-essential packages

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs show dev | grep "foo/bar" | wc -l | tr -d ' '
```

```expect
0
```

### should list the three essentials

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs show dev | grep "aux4/" | wc -l | tr -d ' '
```

```expect
3
```

## clone with --from

### should copy the source profile packages

```execute
export HOME=$(mktemp -d); node ./seed.mjs foo/bar; node ../lib/profile.mjs create clone --from default >/dev/null; node ../lib/profile.mjs show clone | grep "foo/bar" | wc -l | tr -d ' '
```

```expect
1
```

## guard

### should refuse an existing profile name

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create default
```

```error:partial
profile already exists: default
```
