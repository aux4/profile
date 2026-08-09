#### Description

The `delete` command removes a profile's reference folder (`profiles/<name>/`). It refuses to delete the `default` profile, which is the fail-safe, and refuses to delete the currently active profile — switch away first with `aux4 profile use default`. Deleting a profile only removes its reference files; no shared package files are affected, and no other profile changes.

#### Usage

```bash
aux4 profile delete <name>
```

name  Profile to delete (required)

#### Example

```bash
aux4 profile delete work
```

```text
deleted profile work
```
