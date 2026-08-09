# profile list

Isolated `$HOME` per test; the real config is never touched.

## with the active marker

### should mark the active profile with an asterisk

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs list
```

```expect
* default
```

### should list every profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs list | grep -E "dev|default" | wc -l | tr -d ' '
```

```expect
2
```

### should move the marker after use

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs use dev >/dev/null 2>&1; node ../lib/profile.mjs list | grep dev
```

```expect
* dev
```
