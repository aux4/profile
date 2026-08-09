#!/usr/bin/env node
// aux4/profile — named profiles as SUBSETS of a SHARED package store.
//
// Layout under $HOME/.aux4.config:
//   packages/                       shared real package dirs (single version)
//   packages/all.json -> ../profiles/<active>/all.json      (symlink)
//   global.aux4       -> profiles/<active>/global.aux4       (symlink)
//   profiles/<name>/{ all.json, global.aux4 }               tiny real ref files
//
// A profile is just the pair of reference files selecting which shared
// packages load. Switching = flip two symlinks. Package FILES are never
// copied or per-profile — updating a package applies to every profile at once.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ESSENTIALS = ["aux4/aux4", "aux4/pkger", "aux4/profile"];

// ---------------------------------------------------------------------------
// paths
// ---------------------------------------------------------------------------

function home() {
  return process.env.HOME || os.homedir();
}
function cfg() {
  return path.join(home(), ".aux4.config");
}
const P = {
  get global() {
    return path.join(cfg(), "global.aux4");
  },
  get packages() {
    return path.join(cfg(), "packages");
  },
  get allJson() {
    return path.join(cfg(), "packages", "all.json");
  },
  get profiles() {
    return path.join(cfg(), "profiles");
  },
  get backup() {
    return path.join(cfg(), ".global.aux4.pre-profile.bak");
  },
  profileDir(name) {
    return path.join(cfg(), "profiles", name);
  },
  profileGlobal(name) {
    return path.join(cfg(), "profiles", name, "global.aux4");
  },
  profileAll(name) {
    return path.join(cfg(), "profiles", name, "all.json");
  },
};

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeJson(file, obj) {
  // Truncate-in-place write so an existing symlink is followed (write-through).
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
}
function scopeName(pkg) {
  if (!pkg) return pkg;
  const at = pkg.indexOf("@");
  return at === -1 ? pkg : pkg.slice(0, at);
}
function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}
function exists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}
function fail(msg) {
  process.stderr.write("error: " + msg + "\n");
  process.exit(1);
}
function info(msg) {
  process.stdout.write(msg + "\n");
}
function warn(msg) {
  process.stderr.write("warning: " + msg + "\n");
}

// Re-point a symlink at `linkPath` to `target` (relative), replacing any
// existing entry. Never touches the target's contents.
function relink(linkPath, target) {
  if (exists(linkPath)) fs.rmSync(linkPath, { force: true });
  fs.symlinkSync(target, linkPath);
}

// ---------------------------------------------------------------------------
// migration state
// ---------------------------------------------------------------------------

function isMigrated() {
  return fs.existsSync(P.profiles) && isSymlink(P.global);
}

// active profile = parent-basename of the global.aux4 symlink target.
function activeProfile() {
  if (!isSymlink(P.global)) return null;
  const target = fs.readlinkSync(P.global); // e.g. profiles/dev/global.aux4
  return path.basename(path.dirname(target));
}

// keep both symlinks pointed at the SAME profile; repair if they disagree.
function verifyAndRepair() {
  const g = activeProfile();
  let a = null;
  if (isSymlink(P.allJson)) {
    a = path.basename(path.dirname(fs.readlinkSync(P.allJson)));
  }
  if (g && a !== g) {
    warn(`symlinks disagreed (global=${g} all.json=${a}); repairing all.json`);
    relink(P.allJson, path.join("..", "profiles", g, "all.json"));
  }
  return g;
}

function listProfiles() {
  if (!fs.existsSync(P.profiles)) return [];
  return fs
    .readdirSync(P.profiles, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

// ---------------------------------------------------------------------------
// bootstrap (lazy + explicit `init`)
// ---------------------------------------------------------------------------

function bootstrap() {
  if (isMigrated()) {
    // Idempotent: make sure default exists.
    if (!fs.existsSync(P.profileDir("default"))) {
      warn("migrated but profiles/default missing");
    }
    return false;
  }

  if (!fs.existsSync(P.global)) {
    fail(`no global.aux4 at ${P.global} — is aux4 installed for this HOME?`);
  }

  // 1. backup
  fs.copyFileSync(P.global, P.backup);

  // 2. profiles/default + move global.aux4 there, symlink root -> it
  fs.mkdirSync(P.profileDir("default"), { recursive: true });
  fs.renameSync(P.global, P.profileGlobal("default"));
  fs.symlinkSync(path.join("profiles", "default", "global.aux4"), P.global);

  // 3. move packages/all.json -> default, symlink packages/all.json -> it
  if (fs.existsSync(P.allJson) && !isSymlink(P.allJson)) {
    fs.renameSync(P.allJson, P.profileAll("default"));
  } else if (!fs.existsSync(P.profileAll("default"))) {
    // no lockfile yet — seed an empty one
    writeJson(P.profileAll("default"), {
      packages: {},
      dependencies: {},
      systemDependencies: {},
    });
  }
  fs.symlinkSync(path.join("..", "profiles", "default", "all.json"), P.allJson);

  return true;
}

function ensureMigrated() {
  if (!isMigrated()) bootstrap();
  verifyAndRepair();
}

// ---------------------------------------------------------------------------
// reference lift / prune
// ---------------------------------------------------------------------------

// Expand a set of scope/names to also include their (transitive) dependencies
// that are present in the source all.json — so a lifted profile still loads.
function withDeps(snList, srcAll) {
  const out = new Set();
  const stack = [...snList];
  while (stack.length) {
    const sn = stack.pop();
    if (out.has(sn)) continue;
    out.add(sn);
    const entry = srcAll.packages && srcAll.packages[sn];
    if (entry && Array.isArray(entry.dependencies)) {
      for (const dep of entry.dependencies) {
        if (!out.has(dep)) stack.push(dep);
      }
    }
  }
  return out;
}

// Copy the all.json bookkeeping for scope/name `sn` from src into dst.
function liftAllEntry(srcAll, dstAll, sn) {
  if (srcAll.packages && srcAll.packages[sn]) {
    dstAll.packages[sn] = JSON.parse(JSON.stringify(srcAll.packages[sn]));
  }
  if (srcAll.dependencies && srcAll.dependencies[sn]) {
    dstAll.dependencies[sn] = JSON.parse(
      JSON.stringify(srcAll.dependencies[sn])
    );
  }
  // system dependencies declared by the package
  const entry = srcAll.packages && srcAll.packages[sn];
  const sys = entry && entry.system;
  if (Array.isArray(sys) && srcAll.systemDependencies) {
    for (const id of sys) {
      if (srcAll.systemDependencies[id]) {
        dstAll.systemDependencies[id] = JSON.parse(
          JSON.stringify(srcAll.systemDependencies[id])
        );
      }
    }
  }
}

// Lift every command whose ref.package scope/name is in `snSet` from srcGlobal
// into dstGlobal, preserving profile structure. `main` is always present.
function liftGlobalFragment(srcGlobal, dstGlobal, snSet) {
  if (!Array.isArray(dstGlobal.profiles)) dstGlobal.profiles = [];
  const dstByName = new Map(dstGlobal.profiles.map((p) => [p.name, p]));

  for (const sp of srcGlobal.profiles || []) {
    const picked = (sp.commands || []).filter((c) => {
      if (!c.ref) return false;
      return snSet.has(scopeName(c.ref.package));
    });
    if (picked.length === 0) continue;

    let dp = dstByName.get(sp.name);
    if (!dp) {
      dp = { name: sp.name, commands: [] };
      dstGlobal.profiles.push(dp);
      dstByName.set(sp.name, dp);
    }
    const have = new Set((dp.commands || []).map((c) => c.name));
    for (const c of picked) {
      if (!have.has(c.name)) {
        dp.commands.push(JSON.parse(JSON.stringify(c)));
        have.add(c.name);
      }
    }
  }

  // guarantee a `main` profile exists (even if empty)
  if (!dstByName.has("main")) {
    dstGlobal.profiles.unshift({ name: "main", commands: [] });
  }
}

// Remove every command whose ref.package scope/name is in `snSet`. Drop
// profiles that become empty EXCEPT `main`. Hooks are untouched.
function pruneGlobalFragment(dstGlobal, snSet) {
  const kept = [];
  for (const p of dstGlobal.profiles || []) {
    p.commands = (p.commands || []).filter((c) => {
      if (!c.ref) return true; // unattributed commands always stay
      return !snSet.has(scopeName(c.ref.package));
    });
    if (p.name === "main" || p.commands.length > 0) kept.push(p);
  }
  dstGlobal.profiles = kept;
}

// Build an empty global.aux4 that carries src's root metadata + hooks but no
// commands, then lift the essentials into it.
function emptyGlobalFrom(srcGlobal) {
  const g = JSON.parse(JSON.stringify(srcGlobal));
  g.profiles = [];
  // hooks preserved verbatim from src
  return g;
}

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

function cmdInit() {
  const did = bootstrap();
  verifyAndRepair();
  if (did) info("migrated flat config into profiles/default (active: default)");
  else info(`already migrated (active: ${activeProfile()})`);
}

function cmdList() {
  ensureMigrated();
  const active = activeProfile();
  const names = listProfiles();
  if (names.length === 0) {
    info("(no profiles)");
    return;
  }
  for (const n of names) {
    info(`${n === active ? "*" : " "} ${n}`);
  }
}

function cmdShow(name) {
  ensureMigrated();
  const target = name || activeProfile();
  if (!fs.existsSync(P.profileDir(target))) fail(`unknown profile: ${target}`);
  const all = readJson(P.profileAll(target));
  const pkgs = Object.keys(all.packages || {}).sort();
  info(`profile ${target}${target === activeProfile() ? " (active)" : ""}: ${pkgs.length} packages`);
  for (const p of pkgs) {
    const v = all.packages[p].version ? `@${all.packages[p].version}` : "";
    // read-only annotation: flag refs whose shared files are gone from disk
    const miss = pkgDirExists(p) ? "" : " (missing)";
    info(`  ${p}${v}${miss}`);
  }
}

function cmdCreate(name, from) {
  ensureMigrated();
  if (!name) fail("create requires a profile name");
  if (fs.existsSync(P.profileDir(name))) fail(`profile already exists: ${name}`);

  if (from) {
    if (!fs.existsSync(P.profileDir(from))) fail(`unknown source profile: ${from}`);
    fs.mkdirSync(P.profileDir(name), { recursive: true });
    fs.copyFileSync(P.profileAll(from), P.profileAll(name));
    fs.copyFileSync(P.profileGlobal(from), P.profileGlobal(name));
    info(`created profile ${name} (cloned from ${from})`);
    return;
  }

  // minimal: essentials only
  const active = activeProfile();
  const srcAll = readJson(P.profileAll(active));
  const srcGlobal = readJson(P.profileGlobal(active));

  const present = ESSENTIALS.filter(
    (e) => srcAll.packages && srcAll.packages[e]
  );
  const snSet = withDeps(present, srcAll);

  const newAll = {
    packages: {},
    dependencies: {},
    systemDependencies: {},
  };
  for (const sn of snSet) liftAllEntry(srcAll, newAll, sn);

  const newGlobal = emptyGlobalFrom(srcGlobal);
  liftGlobalFragment(srcGlobal, newGlobal, snSet);

  fs.mkdirSync(P.profileDir(name), { recursive: true });
  writeJson(P.profileAll(name), newAll);
  writeJson(P.profileGlobal(name), newGlobal);
  info(
    `created minimal profile ${name} (${present.join(", ") || "no essentials found"})`
  );
}

function cmdUse(name) {
  ensureMigrated();
  if (!name) fail("use requires a profile name");
  if (!fs.existsSync(P.profileDir(name))) fail(`unknown profile: ${name}`);
  // LAZY VALIDATION: clean any dangling refs (files uninstalled since this
  // profile was last active) before it becomes active.
  const pruned = pruneMissingRefs(name);
  relink(P.global, path.join("profiles", name, "global.aux4"));
  relink(P.allJson, path.join("..", "profiles", name, "all.json"));
  info(`active profile: ${name}`);
  if (pruned.length) {
    info(`dropped missing packages: ${pruned.join(", ")}`);
  }
  warn("a running aux4 daemon caches config at startup — restart it to apply");
}

function cmdDelete(name) {
  ensureMigrated();
  if (!name) fail("delete requires a profile name");
  if (name === "default") fail("refusing to delete the default profile");
  if (name === activeProfile()) fail(`refusing to delete the active profile: ${name}`);
  if (!fs.existsSync(P.profileDir(name))) fail(`unknown profile: ${name}`);
  fs.rmSync(P.profileDir(name), { recursive: true, force: true });
  info(`deleted profile ${name}`);
}

// find any profile (other than `exclude`) whose all.json contains sn
function findProfileWith(sn, exclude) {
  for (const p of listProfiles()) {
    if (p === exclude) continue;
    const all = readJson(P.profileAll(p));
    if (all.packages && all.packages[sn]) return p;
  }
  return null;
}

function cmdAdd(pkg) {
  ensureMigrated();
  const sn = scopeName(pkg);
  if (!sn) fail("add requires a package (scope/name)");
  const active = activeProfile();
  const activeAll = readJson(P.profileAll(active));
  if (activeAll.packages && activeAll.packages[sn]) {
    fail(`${sn} is already in the active profile (${active})`);
  }
  const src = findProfileWith(sn, active);
  if (!src) fail(`${sn} is not present in any profile — install it first`);

  const srcAll = readJson(P.profileAll(src));
  const srcGlobal = readJson(P.profileGlobal(src));
  const activeGlobal = readJson(P.profileGlobal(active));

  const snSet = withDeps([sn], srcAll);
  // only add what is missing
  for (const s of snSet) {
    if (!(activeAll.packages && activeAll.packages[s])) {
      liftAllEntry(srcAll, activeAll, s);
    }
  }
  liftGlobalFragment(srcGlobal, activeGlobal, snSet);

  writeJson(P.profileAll(active), activeAll);
  writeJson(P.profileGlobal(active), activeGlobal);
  info(`added ${sn} to ${active} (from ${src})`);
}

function cmdRemove(pkg) {
  ensureMigrated();
  const sn = scopeName(pkg);
  if (!sn) fail("remove requires a package (scope/name)");
  if (ESSENTIALS.includes(sn)) fail(`refusing to remove essential package: ${sn}`);
  const active = activeProfile();
  const activeAll = readJson(P.profileAll(active));
  if (!(activeAll.packages && activeAll.packages[sn])) {
    fail(`${sn} is not in the active profile (${active})`);
  }
  delete activeAll.packages[sn];
  if (activeAll.dependencies) delete activeAll.dependencies[sn];

  const activeGlobal = readJson(P.profileGlobal(active));
  pruneGlobalFragment(activeGlobal, new Set([sn]));

  writeJson(P.profileAll(active), activeAll);
  writeJson(P.profileGlobal(active), activeGlobal);
  info(`removed ${sn} from ${active} (reference only — files untouched)`);
}

// Resolve a raw `--to`/`--sync` target list against the active profile.
// A list containing "all" expands to every profile except the active one.
function resolveTargets(rawTargets, active) {
  if (rawTargets.includes("all")) {
    return listProfiles().filter((p) => p !== active);
  }
  return rawTargets;
}

// Lift package `sn` (+ its missing deps) from the active profile into each
// target. `tolerant` skips unknown targets with a warning instead of failing —
// used by the install hook, where a bad target must not abort pkger.
function propagateReference(sn, targets, active, { tolerant = false } = {}) {
  const srcAll = readJson(P.profileAll(active));
  const srcGlobal = readJson(P.profileGlobal(active));
  const snSet = withDeps([sn], srcAll);
  const done = [];
  for (const t of targets) {
    if (t === active) continue;
    if (!fs.existsSync(P.profileDir(t))) {
      if (tolerant) {
        warn(`unknown target profile: ${t} (skipped)`);
        continue;
      }
      fail(`unknown target profile: ${t}`);
    }
    const tAll = readJson(P.profileAll(t));
    const tGlobal = readJson(P.profileGlobal(t));
    for (const s of snSet) {
      if (!(tAll.packages && tAll.packages[s])) liftAllEntry(srcAll, tAll, s);
    }
    liftGlobalFragment(srcGlobal, tGlobal, snSet);
    writeJson(P.profileAll(t), tAll);
    writeJson(P.profileGlobal(t), tGlobal);
    done.push(t);
  }
  return done;
}

function cmdSync(pkg, toList) {
  ensureMigrated();
  const sn = scopeName(pkg);
  if (!sn) fail("sync requires a package (scope/name)");
  const active = activeProfile();
  const srcAll = readJson(P.profileAll(active));
  if (!(srcAll.packages && srcAll.packages[sn])) {
    fail(`${sn} is not in the active profile (${active}) — nothing to sync`);
  }
  const targets = resolveTargets(toList, active);
  if (targets.length === 0) fail("no target profiles");
  const done = propagateReference(sn, targets, active);
  info(`synced ${sn} to: ${done.join(", ")}`);
}

function cmdTeardown() {
  if (!isMigrated()) {
    info("not migrated — nothing to tear down");
    return;
  }
  // switch to default first
  relink(P.global, path.join("profiles", "default", "global.aux4"));
  relink(P.allJson, path.join("..", "profiles", "default", "all.json"));

  // collapse symlinks back into real files by moving default's pair out
  fs.rmSync(P.global, { force: true });
  fs.renameSync(P.profileGlobal("default"), P.global);

  fs.rmSync(P.allJson, { force: true });
  fs.renameSync(P.profileAll("default"), P.allJson);

  // default folder is now empty — remove it, keep every other profile folder
  try {
    fs.rmdirSync(P.profileDir("default"));
  } catch {
    /* not empty / already gone */
  }
  info("collapsed to a flat config (default). Other profile folders kept.");
}

// ---------------------------------------------------------------------------
// hook internals (see README for the empirical verdicts)
//
// SHIPPED hooks (wired in package/.aux4):
//   aux4:pkger/install   before -> _hook-install-before
//   aux4:pkger/install   after  -> _hook-install-after values(sync*)
//   aux4:pkger/uninstall before -> _hook-uninstall-before 'pkg=${package}'
//
// Install `--sync` sugar: the before hook snapshots the active package set; the
// after hook diffs to find the newly-installed package(s) and propagates each
// one's REFERENCE to the `--sync` targets. Targets are read with the aux4 DSL
// function values(sync*) (NOT ${sync}, which crashes aux4): passed BARE it
// renders as a shell-safe, JSON-parseable array string. --sync is boolean-ish:
//   bare `--sync` / `--sync=true` -> ["true"] -> ALL other profiles
//   `--sync=<profile>`            -> ["<profile>"] -> that profile
//   (no flag)                     -> [] -> no-op (active only)
// NOTE (empirical): in the pkger-install hook scope only the bare boolean and a
// single `--sync=<value>` read through; space-separated (`--sync x`) and
// repeated (`--sync a --sync b`) forms do NOT survive pkger's arg forwarding.
// For multiple specific targets use the standalone `profile sync` command.
//
// Uninstall: the before hook only auto-tears-down when aux4/profile itself is
// being removed. It does NOT prune the uninstalled package from other profiles
// — that would corrupt them during `releaser install` (which uninstalls then
// reinstalls). Dangling refs are cleaned LAZILY when a profile is activated
// (see pruneMissingRefs / cmdUse).
// ---------------------------------------------------------------------------

const INSTALL_SNAP = () => path.join(cfg(), ".profile.install-snapshot.json");

// Parse the bare values(sync*) argument, which aux4 renders as a JSON array
// string, e.g.  ["all"]  or  ["work","qa"]  or  [].
function parseSyncArg(arg) {
  if (!arg) return [];
  let list;
  try {
    list = JSON.parse(arg);
  } catch {
    list = arg
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((s) => s.replace(/^["']|["']$/g, ""));
  }
  if (!Array.isArray(list)) list = [list];
  return list.map((s) => String(s).trim()).filter(Boolean);
}

// Parse the single-quoted ${package} argument, which aux4 renders as a JSON
// array string, e.g.  pkg=["scope/name","scope/name@1.2.3"]
function parsePkgArg(arg) {
  if (!arg) return [];
  const raw = arg.startsWith("pkg=") ? arg.slice(4) : arg;
  let list;
  try {
    list = JSON.parse(raw);
  } catch {
    // fall back to a bracket-stripped comma split
    list = raw
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((s) => s.replace(/^["']|["']$/g, ""));
  }
  if (!Array.isArray(list)) list = [list];
  return list.map((p) => scopeName(String(p).trim())).filter(Boolean);
}

function pkgDirExists(sn) {
  return fs.existsSync(path.join(P.packages, ...sn.split("/"), ".aux4"));
}

// LAZY VALIDATION: drop references to packages whose shared files are gone from
// disk, from the given profile's all.json + global.aux4. Never deletes files;
// keeps `main`; preserves hooks. Returns the list of pruned scope/names.
function pruneMissingRefs(profileName) {
  const all = readJson(P.profileAll(profileName));
  const missing = new Set(
    Object.keys(all.packages || {}).filter((sn) => !pkgDirExists(sn))
  );
  if (missing.size === 0) return [];
  for (const sn of missing) {
    delete all.packages[sn];
    if (all.dependencies) delete all.dependencies[sn];
  }
  const global = readJson(P.profileGlobal(profileName));
  pruneGlobalFragment(global, missing);
  writeJson(P.profileAll(profileName), all);
  writeJson(P.profileGlobal(profileName), global);
  return [...missing];
}

export function hookUninstallBefore(pkgArg) {
  if (!isMigrated()) return; // nothing to protect
  verifyAndRepair();
  const targets = parsePkgArg(pkgArg);
  // AUTO-TEARDOWN: self-uninstall fires our own before hook while our files
  // still exist, so collapse to a flat config before pkger deletes us.
  if (targets.includes("aux4/profile")) {
    cmdTeardown();
  }
  // NOTE: we deliberately do NOT prune the uninstalled package from other
  // profiles here. `releaser install` does uninstall-then-reinstall, so an
  // eager prune would strip a still-wanted package from every non-active
  // profile. Dangling refs are instead cleaned LAZILY the next time a profile
  // is activated (see pruneMissingRefs / cmdUse).
}

// before pkger install: snapshot the active package set so the after hook can
// diff it to find the newly-installed package(s).
export function hookInstallBefore() {
  if (!isMigrated()) return;
  verifyAndRepair();
  const all = readJson(P.profileAll(activeProfile()));
  writeJson(INSTALL_SNAP(), { packages: Object.keys(all.packages || {}) });
}

// after pkger install: read the --sync targets from values(sync*); if any,
// diff against the snapshot to find the newly-installed package(s) and
// propagate each one's REFERENCE into the target profiles.
export function hookInstallAfter(syncArg) {
  let before = null;
  try {
    before = readJson(INSTALL_SNAP()).packages || [];
  } catch {
    /* no snapshot */
  }
  try {
    fs.rmSync(INSTALL_SNAP(), { force: true });
  } catch {}
  if (!isMigrated()) return;

  const rawTargets = parseSyncArg(syncArg);
  if (rawTargets.length === 0) return; // no --sync: active only

  const active = activeProfile();
  // --sync is a boolean-ish flag: a bare `--sync` (or `--sync=true`) renders
  // as ["true"] and means "all other profiles"; otherwise the values are
  // target profile names.
  const targets = rawTargets.includes("true")
    ? listProfiles().filter((p) => p !== active)
    : rawTargets.filter((t) => t !== active);
  if (targets.length === 0) return;

  const beforeSet = new Set(before || []);
  const added = Object.keys(readJson(P.profileAll(active)).packages || {})
    .filter((k) => !beforeSet.has(k))
    .filter((k) => !ESSENTIALS.includes(k));
  if (added.length === 0) return;

  const synced = [];
  for (const sn of added) {
    const done = propagateReference(sn, targets, active, { tolerant: true });
    if (done.length) synced.push(`${sn} -> ${done.join(", ")}`);
  }
  if (synced.length) info(`synced ${synced.join("; ")}`);
}

// ---------------------------------------------------------------------------
// arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        (flags[key] = flags[key] || []).push(true);
      } else {
        (flags[key] = flags[key] || []).push(next);
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseArgs(rest);

  switch (cmd) {
    case "init":
      return cmdInit();
    case "list":
      return cmdList();
    case "show":
      return cmdShow(positional[0]);
    case "create":
      return cmdCreate(positional[0], (flags.from && flags.from[0]) || "");
    case "use":
      return cmdUse(positional[0]);
    case "add":
      return cmdAdd(positional[0]);
    case "remove":
      return cmdRemove(positional[0]);
    case "delete":
      return cmdDelete(positional[0]);
    case "sync": {
      // The .aux4 command passes targets as a positional JSON array via
      // values(to*), e.g.  sync <pkg> ["dev","qa"]  — parse that. Also accept
      // direct --to flags for programmatic/CLI use. Empty -> all other profiles.
      let to = (flags.to || []).map((x) => (x === true ? "all" : x));
      if (to.length === 0 && positional[1]) to = parseSyncArg(positional[1]);
      return cmdSync(positional[0], to.length ? to : ["all"]);
    }
    case "teardown":
      return cmdTeardown();

    // hook internals
    case "_hook-uninstall-before":
      return hookUninstallBefore(positional[0]);
    case "_hook-install-before":
      return hookInstallBefore();
    case "_hook-install-after":
      return hookInstallAfter(positional[0]);

    default:
      fail(`unknown command: ${cmd || "(none)"}`);
  }
}

// Only run the CLI when executed directly; when imported (the uninstall after
// hook uses a catch-guarded dynamic import) do nothing on load. Compare REAL
// paths: the invocation path may contain `..` (the hook calls us through
// `.../pkger/../profile/...`) or traverse a symlink (e.g. macOS /var ->
// /private/var, /tmp -> /private/tmp) that node already resolves in
// import.meta.url — so both sides must be run through realpath.
function isMainEntry() {
  if (!process.argv[1]) return false;
  try {
    return (
      fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}
if (isMainEntry()) {
  main();
}
