#### Description

The `sync` command propagates a package reference from the **active** profile into one or more other profiles. It lifts the package's `all.json` entry and its `global.aux4` command fragments (plus any missing dependencies) into each target — add reference only, no reinstall, no file copy.

This is the guaranteed path for "install (or update) a package once, then make it available in many profiles": install the package while one profile is active, then `sync` its reference into the others. Because the store is shared, all synced profiles run the same single copy.

The package must be present in the active profile. Targets are given with `--to` (repeatable), or `--to all` for every profile except the active one. `sync` refuses an unknown target profile.

#### Usage

```bash
aux4 profile sync <package> [--to <profile> ...] [--to all]
```

package  Package id as scope/name, e.g. aux4/todo (required)
--to     Target profile(s); repeatable, or `all` for every other profile (default: all)

#### Example

```bash
aux4 profile sync aux4/todo --to all
```

```text
synced aux4/todo to: work, demo
```

```bash
aux4 profile sync aux4/todo --to work --to demo
```

```text
synced aux4/todo to: work, demo
```
