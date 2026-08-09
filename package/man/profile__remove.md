#### Description

The `remove` command drops a package reference from the **active** profile. This is a reference-only removal: it deletes the package's entry from the profile's `all.json` and prunes its commands from the profile's `global.aux4` (dropping any profile group that becomes empty, but always keeping `main`, and preserving hooks). It **never deletes files** and it leaves every other profile untouched — the package stays in the shared store and in any other profile that references it.

Use `remove` to hide a package from one profile. To delete a package's files from disk for good, use `aux4 aux4 pkger uninstall` instead (which removes it from every profile).

`remove` refuses the essentials (`aux4/aux4`, `aux4/pkger`, `aux4/profile`) and refuses a package that is not in the active profile.

#### Usage

```bash
aux4 profile remove <package>
```

package  Package id as scope/name, e.g. aux4/todo (required)

#### Example

```bash
aux4 profile remove aux4/todo
```

```text
removed aux4/todo from work (reference only — files untouched)
```
