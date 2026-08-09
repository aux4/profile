#### Description

The `show` command lists the packages a profile references, reading the profile's `all.json`. With no argument it shows the currently active profile. Each line is a `scope/name@version` from that profile's reference list.

A reference whose shared files are gone from disk (a package uninstalled while this profile was inactive) is annotated `(missing)`. `show` is read-only — it never mutates the profile; the dangling reference is cleaned the next time you `aux4 profile use` that profile.

**Note:** the version shown is the label recorded in the profile's `all.json`. Because the store is shared, the *code* a command runs always comes from the single shared package directory, so after an update a non-active profile may display a stale version label while still executing the new code. Re-run `aux4 profile sync <package> --to <profile>` to refresh the label and any interface changes.

#### Usage

```bash
aux4 profile show [name]
```

name  Profile to show. Defaults to the active profile.

#### Example

```bash
aux4 profile show work
```

```text
profile work: 3 packages
  aux4/aux4@5.2.1
  aux4/pkger@1.1.39
  community/slack@1.0.0
```
