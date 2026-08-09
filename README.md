# aux4/profile

Named profiles that make aux4 load a subset of installed packages. Package files live in a single shared store (one copy, one version), and a profile is a tiny pair of reference files selecting which shared packages load — switching a profile just flips two symlinks, so updating a package applies to every profile at once.

- [aux4 hub](https://hub.aux4.io/r/public/packages/aux4/profile)
- [README.md](./package/README.md)
