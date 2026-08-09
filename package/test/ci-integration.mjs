// Real-pkger integration orchestrator for aux4/profile (CI-gated).
//
// SAFETY: this seeds a fresh TEMP HOME from the runner's preinstalled pkger
// (copying only the aux4/aux4 + aux4/pkger package dirs, read-only) and runs
// EVERYTHING under that temp HOME. It never mutates the runner's real config.
//
// Usage:  node ci-integration.mjs <phase>
// Prints "OK" on success; throws (non-zero exit) on any failed assertion.
//
// Phases:
//   install-active-only  real install lands in the ACTIVE profile only
//   sync-bare            `--sync` (bare) propagates to every profile
//   sync-targeted        `--sync=<profile>` targets one profile
//   standalone-sync      `aux4 profile sync <pkg> --to a --to b`
//   uninstall-lazy-prune real uninstall -> lazy prune on next `use`
//   self-teardown        uninstall aux4/profile -> auto-teardown to flat

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.resolve(testDir, ".."); // package/
const srcHome = process.env.HOME; // runner's real config (read-only source)
const ESS = ["aux4/aux4", "aux4/pkger"];
const sn = (p) => (p ? p.split("@")[0] : p);

function sh(cmd, home, opts = {}) {
  return execSync(cmd, {
    // Run OUTSIDE the aux4/profile package tree: otherwise aux4 would load the
    // local package/.aux4 hooks and fire them against pkger install/uninstall.
    cwd: opts.cwd || home,
    env: { ...process.env, HOME: home },
    encoding: "utf8",
    stdio: opts.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  });
}
function aux4(args, home, cwd) {
  return sh(`aux4 ${args}`, home, cwd ? { cwd } : {});
}
function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
}
function count(profile, pkg, home) {
  const out = aux4(`profile show ${profile}`, home);
  return out.split("\n").filter((l) => l.includes(pkg)).length;
}

// --- seed a temp HOME with a working pkger from srcHome -------------------
function seed() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ci-profile-"));
  const srcCfg = path.join(srcHome, ".aux4.config");
  const dstCfg = path.join(home, ".aux4.config");
  const dstPkgs = path.join(dstCfg, "packages");
  fs.mkdirSync(dstPkgs, { recursive: true });
  const rewrite = (s) =>
    typeof s === "string" ? s.split(srcCfg).join(dstCfg) : s;

  for (const p of ESS) {
    const s = path.join(srcCfg, "packages", ...p.split("/"));
    const d = path.join(dstPkgs, ...p.split("/"));
    fs.mkdirSync(path.dirname(d), { recursive: true });
    execSync(`cp -R ${JSON.stringify(s)} ${JSON.stringify(d)}`);
  }

  const g = JSON.parse(
    fs.readFileSync(path.join(srcCfg, "global.aux4"), "utf8")
  );
  for (const prof of g.profiles) {
    prof.commands = (prof.commands || []).filter(
      (c) => c.ref && ESS.includes(sn(c.ref.package))
    );
    for (const c of prof.commands) {
      c.ref.path = rewrite(c.ref.path);
      c.ref.dir = rewrite(c.ref.dir);
    }
  }
  g.profiles = g.profiles.filter(
    (p) => p.name === "main" || p.commands.length > 0
  );
  // start from a clean pre-profile flat state (drop any profile hooks)
  g.hooks = (g.hooks || []).filter(
    (h) => !JSON.stringify(h).includes("profile.mjs")
  );
  fs.writeFileSync(
    path.join(dstCfg, "global.aux4"),
    JSON.stringify(g, null, 2) + "\n"
  );

  const all = JSON.parse(
    fs.readFileSync(path.join(srcCfg, "packages", "all.json"), "utf8")
  );
  const keep = new Set(ESS);
  for (const p of ESS) {
    const e = all.packages[p];
    if (e && Array.isArray(e.dependencies))
      for (const d of e.dependencies) keep.add(d);
  }
  const outAll = { packages: {}, dependencies: {}, systemDependencies: {} };
  for (const k of keep) {
    if (all.packages[k]) outAll.packages[k] = all.packages[k];
    if (all.dependencies[k]) outAll.dependencies[k] = all.dependencies[k];
  }
  fs.writeFileSync(
    path.join(dstPkgs, "all.json"),
    JSON.stringify(outAll, null, 2) + "\n"
  );
  return home;
}

// build + install aux4/profile, bootstrap, return {home, twZip}
function setup() {
  const home = seed();
  const out = path.join(home, "out");
  fs.mkdirSync(out, { recursive: true });

  // build + install the profile package itself so ITS hooks register
  sh(`cd ${JSON.stringify(pkgDir)} && aux4 aux4 pkger build . --currentPlatform true --out ${JSON.stringify(out)}`, home);
  const profZip = fs
    .readdirSync(out)
    .find((f) => f.includes("profile") && f.endsWith(".zip"));
  aux4(`aux4 pkger install --fromFile ${JSON.stringify(path.join(out, profZip))}`, home);
  aux4(`profile init`, home);

  // build a throwaway package (LICENSE + README + trivial command)
  const twDir = path.join(home, "tw-src");
  fs.mkdirSync(twDir, { recursive: true });
  fs.writeFileSync(
    path.join(twDir, ".aux4"),
    JSON.stringify(
      {
        scope: "zz",
        name: "tw",
        version: "0.0.1",
        description: "throwaway integration package",
        license: "MIT",
        profiles: [
          {
            name: "main",
            commands: [
              { name: "tw", execute: ["echo tw-ok"], help: { text: "tw" } },
            ],
          },
        ],
      },
      null,
      2
    )
  );
  fs.writeFileSync(path.join(twDir, "LICENSE"), "MIT\n");
  fs.writeFileSync(path.join(twDir, "README.md"), "# zz/tw\n");
  sh(`cd ${JSON.stringify(twDir)} && aux4 aux4 pkger build . --currentPlatform true --out ${JSON.stringify(out)}`, home);
  const twZip = path.join(
    out,
    fs.readdirSync(out).find((f) => f.startsWith("zz_tw") && f.endsWith(".zip"))
  );
  return { home, twZip, profZip: path.join(out, profZip) };
}

function installTw(home, twZip, flag = "") {
  aux4(`aux4 pkger install --fromFile ${JSON.stringify(twZip)} ${flag}`, home);
}

// --- phases ---------------------------------------------------------------
const phases = {
  "install-active-only"({ home, twZip }) {
    aux4(`profile create dev`, home);
    // active is still default; install lands in default only
    installTw(home, twZip);
    assert(count("default", "zz/tw", home) === 1, "tw missing from default");
    assert(count("dev", "zz/tw", home) === 0, "tw leaked into dev");
    // and the real command is runnable
    assert(aux4("tw", home).includes("tw-ok"), "tw not runnable");
  },
  "sync-bare"({ home, twZip }) {
    aux4(`profile create dev`, home);
    aux4(`profile create qa`, home);
    installTw(home, twZip, "--sync");
    assert(count("default", "zz/tw", home) === 1, "tw missing from default");
    assert(count("dev", "zz/tw", home) === 1, "--sync did not reach dev");
    assert(count("qa", "zz/tw", home) === 1, "--sync did not reach qa");
  },
  "sync-targeted"({ home, twZip }) {
    aux4(`profile create dev`, home);
    aux4(`profile create qa`, home);
    installTw(home, twZip, "--sync=qa");
    assert(count("qa", "zz/tw", home) === 1, "--sync=qa did not reach qa");
    assert(count("dev", "zz/tw", home) === 0, "--sync=qa leaked into dev");
  },
  "standalone-sync"({ home, twZip }) {
    aux4(`profile create dev`, home);
    aux4(`profile create qa`, home);
    installTw(home, twZip); // default only
    aux4(`profile sync zz/tw --to dev --to qa`, home);
    assert(count("dev", "zz/tw", home) === 1, "standalone sync missed dev");
    assert(count("qa", "zz/tw", home) === 1, "standalone sync missed qa");
  },
  "uninstall-lazy-prune"({ home, twZip }) {
    aux4(`profile create dev`, home);
    installTw(home, twZip, "--sync"); // default + dev
    assert(count("dev", "zz/tw", home) === 1, "precondition: tw in dev");
    aux4(`aux4 pkger uninstall zz/tw`, home); // files deleted
    // dev still dangles until activated
    aux4(`profile use dev`, home);
    assert(count("dev", "zz/tw", home) === 0, "lazy prune did not drop tw");
  },
  // PKG-096 regression: `releaser install` does uninstall-then-install of
  // aux4/profile ITSELF, running pkger from the package dir (cwd), so aux4
  // loads the LOCAL package/.aux4 hooks. The reinstall's install-before hook
  // fired against the just-deleted profile.mjs -> MODULE_NOT_FOUND -> abort.
  // The guarded hooks must make a missing lib a no-op instead of a crash.
  "releaser-reinstall"({ home, profZip }) {
    aux4(`profile create minimal`, home);
    // run uninstall + reinstall with cwd = package dir (as releaser does)
    aux4(`aux4 pkger uninstall aux4/profile`, home, pkgDir);
    // this reinstall crashed before the fix:
    aux4(`aux4 pkger install --fromFile ${JSON.stringify(profZip)}`, home, pkgDir);
    // profile must still work afterwards (re-bootstraps, keeps minimal)
    const list = aux4(`profile list`, home);
    assert(list.includes("default"), "default missing after releaser reinstall");
    assert(list.includes("minimal"), "minimal lost after releaser reinstall");
  },
  "self-teardown"({ home }) {
    aux4(`profile create minimal`, home);
    aux4(`profile create prod`, home);
    aux4(`aux4 pkger uninstall aux4/profile`, home);
    const cfg = path.join(home, ".aux4.config");
    assert(
      !fs.lstatSync(path.join(cfg, "global.aux4")).isSymbolicLink(),
      "global.aux4 still a symlink after teardown"
    );
    assert(
      !fs.lstatSync(path.join(cfg, "packages", "all.json")).isSymbolicLink(),
      "all.json still a symlink after teardown"
    );
    for (const p of ["minimal", "prod"]) {
      assert(
        fs.existsSync(path.join(cfg, "profiles", p)),
        `profile folder ${p} not kept`
      );
    }
  },
};

export { seed, setup, phases };

// --- main -----------------------------------------------------------------
function main() {
  const phase = process.argv[2];
  if (!phases[phase]) {
    console.error("unknown phase: " + phase);
    process.exit(2);
  }
  let ctx;
  try {
    ctx = setup();
    phases[phase](ctx);
    console.log("OK");
  } finally {
    if (ctx && ctx.home) {
      try {
        fs.rmSync(ctx.home, { recursive: true, force: true });
      } catch {}
    }
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
