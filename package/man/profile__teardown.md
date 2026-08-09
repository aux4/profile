#### Description

The `teardown` command reverses the bootstrap. It first switches to the `default` profile, then collapses the two symlinks back into ordinary files by **moving** `profiles/default/global.aux4` → `~/.aux4.config/global.aux4` and `profiles/default/all.json` → `~/.aux4.config/packages/all.json`. Every other `profiles/<name>/` folder is kept, so you can restore the layout later by reinstalling `aux4/profile` and running `init`.

Run `teardown` before uninstalling `aux4/profile` to leave a clean flat config. You usually do not need to: uninstalling `aux4/profile` triggers an automatic teardown, and even without it the fail-safe holds — the symlinks still point at `profiles/default`, so aux4 keeps working.

On a config that was never migrated, `teardown` is a no-op.

#### Usage

```bash
aux4 profile teardown
```

#### Example

```bash
aux4 profile teardown
```

```text
collapsed to a flat config (default). Other profile folders kept.
```
