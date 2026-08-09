# 0.0.1

First release of `aux4/profile` — named profiles as subsets of a shared package store.

- Named profiles that load a subset of installed packages; switching flips two symlinks (`global.aux4` + `packages/all.json`) into the active profile folder.
- Shared package store: package files are never duplicated, so updating a package applies to every profile at once.
- Commands: `init`, `list`, `show`, `create [--from]`, `use`, `add`, `remove`, `sync`, `delete`, `teardown`.
- `pkger install --sync` propagates a newly installed package to other profiles (bare `--sync` = all; `--sync=<profile>` = one); standalone `profile sync --to` for multiple targets.
- Lazy validation drops references to genuinely-removed packages on profile switch; `remove` is reference-only (never deletes files).
- Uninstalling `aux4/profile` auto-tears-down back to the flat layout, keeping other profile folders.
