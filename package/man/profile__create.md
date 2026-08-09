#### Description

The `create` command defines a new profile. There are two modes:

- **minimal (default)** — the new profile references only the **essentials** (`aux4/aux4`, `aux4/pkger`, `aux4/profile`, whichever are installed). Their reference entries and `global.aux4` command fragments are lifted from the active profile. No package files are copied — the store is shared. This gives you a lean profile you build up with `aux4 aux4 pkger install …` (while it is active) or `aux4 profile add`.
- **clone (`--from <src>`)** — copy `profiles/<src>/all.json` and `profiles/<src>/global.aux4` into the new profile, reproducing the source profile's full selection.

Creating a profile does not switch to it; run `aux4 profile use <name>` afterwards. The command refuses to create a profile that already exists.

#### Usage

```bash
aux4 profile create <name> [--from <src>]
```

name    Name of the new profile (required)
--from  Source profile to clone; omit for a minimal (essentials-only) profile

#### Example

```bash
aux4 profile create work
```

```text
created minimal profile work (aux4/aux4, aux4/pkger, aux4/profile)
```

```bash
aux4 profile create work-copy --from work
```

```text
created profile work-copy (cloned from work)
```
