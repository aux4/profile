#### Description

The `add` command brings an already-installed package into the **active** profile as a reference. The package is given as `scope/name`; any version suffix is ignored. It must already exist as a reference in some other profile (i.e. it is installed in the shared store) — `add` selects from what is installed, it does not install anything and it copies no files.

`add` lifts the package's `all.json` entry and its `global.aux4` command fragments from a profile that already has it, plus any of its dependencies that are missing. It refuses a package that is already in the active profile, or one present in no profile at all.

#### Usage

```bash
aux4 profile add <package>
```

package  Package id as scope/name, e.g. aux4/todo (required)

#### Example

```bash
aux4 profile add aux4/todo
```

```text
added aux4/todo to work (from default)
```
