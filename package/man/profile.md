#### Description

The `profile` command group manages named **profiles** — named subsets of your installed packages. Package files live in a single shared store (`~/.aux4.config/packages/`), so every package has one copy at one version. A profile is just a small pair of reference files (`all.json` + `global.aux4`) that selects which of the shared packages load. Switching a profile flips two symlinks; nothing is installed, removed, or copied.

Because the store is shared, updating a package (installing a newer version) applies to **every** profile that references it at once — update once, available everywhere.

Sub-commands:

- **init** — migrate the flat config into `profiles/default` and lay the two symlinks (also happens lazily on first use).
- **list** — list all profiles and mark the active one with `*`.
- **show** — show the packages a profile references (defaults to the active profile).
- **create** — create a new profile: minimal (essentials only) by default, or a full clone with `--from`.
- **use** — switch the active profile by repointing both symlinks.
- **add** — bring an already-installed package into the active profile as a reference.
- **remove** — drop a package reference from the active profile (files untouched).
- **sync** — propagate a package reference from the active profile into other profiles.
- **delete** — delete a profile (refuses `default` and the active profile).
- **teardown** — reverse the bootstrap: switch to `default` and collapse the symlinks back into a flat config.

The `default` profile is the fail-safe: if `aux4/profile` is ever uninstalled, the symlinks still point at `profiles/default`, so aux4 keeps working.

#### Usage

```bash
aux4 profile <command> [arguments]
```

#### Example

```bash
aux4 profile list
```

```text
* default
  work
```
