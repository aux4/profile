#### Description

The `init` command bootstraps the profile layout. It is idempotent, and it also runs automatically (lazily) the first time you use any other `aux4 profile` command, so you rarely need to run it by hand.

On a not-yet-migrated config (a real `global.aux4` file rather than a symlink) it:

- backs up `~/.aux4.config/global.aux4` to `~/.aux4.config/.global.aux4.pre-profile.bak`,
- creates `profiles/default/` and **moves** `global.aux4` into it, then symlinks `~/.aux4.config/global.aux4` → `profiles/default/global.aux4`,
- **moves** `packages/all.json` into `profiles/default/` and symlinks `packages/all.json` → `../profiles/default/all.json`,
- makes `default` the active profile.

The shared package directories under `packages/` are **not** moved — they stay in place and are shared by every profile. The migration is non-invasive: until you use `aux4 profile`, your config is untouched.

#### Usage

```bash
aux4 profile init
```

#### Example

```bash
aux4 profile init
```

```text
migrated flat config into profiles/default (active: default)
```
