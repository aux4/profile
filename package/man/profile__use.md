#### Description

The `use` command switches the active profile by repointing **both** symlinks — `~/.aux4.config/global.aux4` and `~/.aux4.config/packages/all.json` — at the target profile's reference files. No packages are installed, removed, or copied; only the visible subset changes. The switch is instant and reversible.

Before activating, `use` validates the target profile lazily: any reference whose shared files are gone from disk (a package that was genuinely uninstalled while this profile was inactive) is dropped from the profile's `all.json` and `global.aux4`, and reported as `dropped missing packages: …`. A package whose files still exist — for example after `releaser install` reinstalled it — keeps its reference. This never deletes files.

The command refuses an unknown profile.

**Note:** a running aux4 daemon caches its configuration when it starts. After switching profiles, restart any long-running daemon (for example `aux4 browser stop && aux4 browser start`) for the change to take effect there. Ordinary interactive commands read the freshly linked configuration immediately.

#### Usage

```bash
aux4 profile use <name>
```

name  Profile to activate (required)

#### Example

```bash
aux4 profile use work
```

```text
active profile: work
warning: a running aux4 daemon caches config at startup — restart it to apply
```
