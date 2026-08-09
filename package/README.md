# aux4/profile

Named **profiles** that make aux4 load a *subset* of your installed packages.

As you install more aux4 packages, every one of them contributes commands to your configuration. `aux4/profile` lets you define named selections — a lean `work` profile with just the packages you use day to day, a `demo` profile that hides everything experimental — and switch between them instantly. Switching a profile installs and uninstalls nothing: your package files stay exactly where they are, and only the *visible* subset changes.

## Installation

```bash
aux4 aux4 pkger install aux4/profile
```

Requires Node.js on your `PATH` (declared as a system dependency and installed automatically if missing).

## Quick Start

```bash
# First use bootstraps the layout automatically (or run `aux4 profile init`).
aux4 profile list
# * default

# Create a lean profile (essentials only), switch to it, install into it
aux4 profile create work
aux4 profile use work
aux4 aux4 pkger install aux4/todo      # lands in `work`

# Only the essentials + aux4/todo are loaded now
aux4 profile show

# Make aux4/todo available in every profile too — no reinstall
aux4 profile sync aux4/todo --to all

# Switch back
aux4 profile use default
```

## How Profiles Work: Shared Store, Two Symlinks

Package **files are shared**. There is a single store of real package directories at `~/.aux4.config/packages/`, each package present once at one version. A profile is just a small pair of reference files that selects which of those shared packages load:

```text
~/.aux4.config/
  packages/                                   # SHARED real package dirs (single version)
    all.json  -> ../profiles/<active>/all.json     # symlink (only all.json is per-profile)
    <scope>/<name>/…                               # shared files, NOT per-profile
  global.aux4 -> profiles/<active>/global.aux4      # symlink
  config/  .oauth/  .pkg-index/               # shared at root, untouched
  profiles/
    default/  { all.json, global.aux4 }        # tiny real reference files
    work/     { all.json, global.aux4 }
```

Switching a profile flips just the two symlinks — `global.aux4` and `packages/all.json` — to point at another profile's reference files. The active profile is derived from the target of the `global.aux4` symlink; `aux4/profile` keeps both symlinks pointing at the same profile and repairs them if they ever drift.

## Update Once, Available Everywhere

Because the store is shared, there is only ever one copy of a package at one version. When you install a newer version with `aux4 aux4 pkger install`, it replaces the shared files — so **every profile that references that package runs the new version immediately**. There is no per-profile version pinning; that is the whole point.

A profile's commands invoke the shared files through a stable package-directory path, so an update applies without touching any other profile. (The command *interface* recorded in a non-active profile's `global.aux4` — its help text and flag list — is a snapshot; if an update changes the interface, re-run `aux4 profile sync <package> --to <profile>` to refresh it. The running code is always the shared latest regardless.)

## `remove` (reference only) vs `pkger uninstall` (global delete)

Two very different operations:

- **`aux4 profile remove <package>`** drops the package's *reference* from the **active** profile only. It never deletes files, and every other profile keeps the package. Use it to hide a package from one profile.
- **`aux4 aux4 pkger uninstall <package>`** deletes the package's shared files from disk. Since the files are shared, the package becomes unusable in *every* profile. The active profile is cleaned by the package manager itself; other profiles keep the (now dangling) reference until they are next activated, at which point `use` drops any reference whose files are gone (**lazy validation** — see below). Until then, `aux4 profile show` marks such an entry `(missing)`.

## `sync`: install (or update) once, make available in many profiles

Installing a package lands it in the active profile only. To make an already-installed package available in other profiles without reinstalling:

```bash
aux4 profile sync aux4/todo --to all          # every other profile
aux4 profile sync aux4/todo --to work --to qa # specific profiles
```

`sync` lifts the package's reference (its `all.json` entry and `global.aux4` command fragments, plus any missing dependencies) from the active profile into each target. No files are copied — all synced profiles share the one installed copy. This is the robust, standalone path for "install once, use in many".

### `--sync` at install time

You can also propagate a package at the moment you install it, with a `--sync` flag on `pkger install`:

```bash
aux4 aux4 pkger install aux4/todo --sync            # into every other profile
aux4 aux4 pkger install aux4/todo --sync=work       # into just the `work` profile
```

An install-time hook reads the `--sync` flag, finds the package you just installed, and propagates its reference into the targets — the same effect as running `aux4 profile sync` immediately after. `--sync` is boolean-ish:

- **`--sync`** (bare) or **`--sync=true`** → propagate to **every** other profile.
- **`--sync=<profile>`** → propagate to that one profile.
- omit `--sync` → install into the active profile only.

The flag is read through the aux4 DSL function `values(sync*)` (not `${sync}`, which crashes aux4 — the DSL functions safely tolerate the undeclared flag).

**Note:** because `pkger install` forwards its arguments, only the bare boolean and a single `--sync=<profile>` read through the install hook reliably. To propagate to **several** specific profiles at once, install normally and then use the standalone command, which supports multiple targets:

```bash
aux4 profile sync aux4/todo --to all           # every other profile
aux4 profile sync aux4/todo --to work --to qa  # several specific profiles
```

## The Essentials and the Fail-Safe

Three packages are pinned in every profile so aux4 always works: **`aux4/aux4`**, **`aux4/pkger`**, and **`aux4/profile`**. `create` seeds them into a new minimal profile, and `remove` refuses them.

If `aux4/profile` is ever uninstalled, **nothing breaks**: the symlinks still point at `profiles/default/`, which stays on disk, so aux4 keeps running on the `default` profile. Only the `aux4 profile` commands themselves go away.

## Bootstrap and Teardown

The layout is created lazily the first time you run any `aux4 profile` command (or explicitly with `aux4 profile init`). Bootstrapping backs up your `global.aux4`, moves it and `packages/all.json` into `profiles/default/`, and lays the two symlinks. Your shared package directories are not moved. It is idempotent and non-invasive — until you use `aux4 profile`, your config is untouched.

`aux4 profile teardown` reverses this: it switches to `default` and collapses the two symlinks back into ordinary flat files, keeping every other `profiles/<name>/` folder. Run it before uninstalling `aux4/profile` for a clean flat config — though you usually do not need to, because uninstalling `aux4/profile` triggers an automatic teardown, and the fail-safe holds either way.

## Restart the Daemon After Switching

A running aux4 daemon (for example the browser daemon) caches its configuration when it starts. Switching profiles flips the symlinks, but a long-running daemon keeps serving the previous selection until restarted:

```bash
aux4 browser stop && aux4 browser start
```

Interactive `aux4 <command>` invocations always read the freshly linked configuration, so no restart is needed for those.

## Lazy Validation

References are validated **lazily**, when a profile becomes active — not eagerly when a package is uninstalled. On `aux4 profile use <name>`, any reference whose shared files are gone from disk (`packages/<scope>/<name>/.aux4` missing) is dropped from that profile's `all.json` and `global.aux4` before it is activated, so the active profile never carries a dangling reference. `show` and `list` never mutate — `show` only annotates missing references with `(missing)`.

This is deliberately **not** an eager "prune from every profile on uninstall" hook. `aux4 aux4 releaser install` (used for local development) *uninstalls then reinstalls* a package; an eager prune would strip that package from every other profile during the uninstall step and silently lose it. With lazy validation, by the time you activate a profile the package's files are back, so the reference stays valid and nothing is lost. A genuine uninstall (files stay gone) is cleaned the next time you `use` an affected profile.

## Hooks

`aux4/profile` installs runtime hooks on the package manager:

1. **`--sync` install sugar** *(on `aux4:pkger/install`)* — a `before` hook snapshots the active package set; an `after` hook diffs to find the newly-installed package and propagates its reference to the `--sync` targets. The flag is read with the aux4 DSL function `values(sync*)`, which renders as a shell-safe JSON array and tolerates an absent flag: bare `--sync`/`--sync=true` → `["true"]` (all profiles), `--sync=<profile>` → `["<profile>"]`, no flag → `[]` (no-op). (Reading it as `${sync}` instead crashes aux4, which is why `values()` is used.)
2. **Auto-teardown** *(on `aux4:pkger/uninstall`)* — when `aux4/profile` itself is being uninstalled, its own `before` hook runs `teardown` first, collapsing the config to flat while its files still exist, so you are left with a clean flat config automatically. This hook does **not** touch other profiles on an ordinary uninstall — reference cleanup is handled lazily on `use` (above).

Every hook invokes `profile.mjs` through a catch-guarded dynamic import, so a **missing or half-removed `profile.mjs` is a no-op, never a crash**. This matters during a reinstall/update (`aux4 aux4 releaser install`, which uninstalls then reinstalls): the file is briefly absent between the two steps, and a hook must never abort the package manager over it.

## Commands

### aux4 profile init

Bootstraps the layout (also happens lazily on first use). Idempotent.

### aux4 profile list

Lists every profile and marks the active one with `*`.

### aux4 profile show [name]

Shows the packages a profile references. With no argument, the active profile.

### aux4 profile create \<name\> [--from \<src\>]

Creates a new profile — minimal (essentials only) by default, or a full clone with `--from <src>`. Refuses an existing name.

### aux4 profile use \<name\>

Switches the active profile by repointing both symlinks. Prints a daemon-restart reminder.

### aux4 profile add \<package\>

Brings an already-installed package (present in another profile) into the active profile as a reference. Refuses a duplicate or a package present in no profile.

### aux4 profile remove \<package\>

Reference-only removal from the active profile. Never deletes files; refuses the essentials.

### aux4 profile sync \<package\> [--to \<profile\> … | --to all]

Propagates a package reference from the active profile into other profiles. No reinstall.

### aux4 profile delete \<name\>

Deletes a profile. Refuses `default` and the active profile.

### aux4 profile teardown

Collapses the symlinks back into a flat config (keeps other profile folders).
