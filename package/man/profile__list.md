#### Description

The `list` command shows every profile you have defined and marks the active one with a `*`. The active profile is derived from the target of the `global.aux4` symlink; `list` also verifies that both symlinks (`global.aux4` and `packages/all.json`) agree and repairs `all.json` if they have drifted.

The built-in `default` profile is always present — it is the fail-safe the config falls back to.

#### Usage

```bash
aux4 profile list
```

#### Example

```bash
aux4 profile list
```

```text
* default
  demo
  work
```
