# profile delete

Isolated `$HOME` per test; the real config is never touched.

## deleting a profile

### should delete a non-active, non-default profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs delete dev
```

```expect
deleted profile dev
```

### should remove the profile folder

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs delete dev >/dev/null; test -d "$HOME/.aux4.config/profiles/dev" && echo present || echo gone
```

```expect
gone
```

## guards

### should refuse the default profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs delete default
```

```error:partial
refusing to delete the default profile
```

### should refuse the active profile

```execute
export HOME=$(mktemp -d); node ./seed.mjs; node ../lib/profile.mjs init >/dev/null; node ../lib/profile.mjs create dev >/dev/null; node ../lib/profile.mjs use dev >/dev/null 2>&1; node ../lib/profile.mjs delete dev
```

```error:partial
refusing to delete the active profile: dev
```
