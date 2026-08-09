// Test helper: seed a fabricated FLAT aux4 config under $HOME/.aux4.config so
// the profile commands can be exercised against an ISOLATED HOME (never the
// real config). Silent on success. Usage: node seed.mjs [scope/name ...]
import fs from "node:fs";
import path from "node:path";

const cfg = path.join(process.env.HOME, ".aux4.config");
const pkgs = path.join(cfg, "packages");
fs.mkdirSync(pkgs, { recursive: true });

const extra = process.argv.slice(2);

function pkgEntry(scope, name, deps = []) {
  return {
    scope,
    name,
    version: "1.0.0",
    license: "MIT",
    url: `file:///seed/${scope}_${name}.zip`,
    sha256: { default: "seed" },
    dependencies: deps,
    system: null,
    platforms: ["darwin/arm64"],
    dist: [],
    tags: [scope, name],
  };
}
function cmd(name, pkg, profile) {
  return {
    name,
    execute: [`echo ${name}`],
    help: { text: `${name}` },
    ref: {
      path: path.join(pkgs, ...pkg.split("/"), ".aux4"),
      dir: path.join(pkgs, ...pkg.split("/")),
      package: pkg + "@1.0.0",
      profile,
    },
  };
}

const packages = {
  "aux4/aux4": pkgEntry("aux4", "aux4", []),
  "aux4/pkger": pkgEntry("aux4", "pkger", ["aux4/aux4"]),
  "aux4/profile": pkgEntry("aux4", "profile", ["aux4/aux4"]),
};
const dependencies = {
  "aux4/aux4": { package: "aux4/aux4", usedBy: ["aux4/pkger"] },
};
for (const e of extra) {
  const [scope, name] = e.split("/");
  packages[e] = pkgEntry(scope, name, ["aux4/aux4"]);
}

const profiles = [
  {
    name: "main",
    commands: [
      cmd("aux4", "aux4/aux4", "main"),
      cmd("profile", "aux4/profile", "main"),
    ],
  },
  {
    name: "aux4",
    commands: [
      cmd("man", "aux4/aux4", "aux4"),
      cmd("pkger", "aux4/pkger", "aux4"),
    ],
  },
  {
    name: "aux4:pkger",
    commands: [cmd("install", "aux4/pkger", "aux4:pkger")],
  },
  {
    name: "profile",
    commands: [cmd("list", "aux4/profile", "profile")],
  },
];
for (const e of extra) {
  const [, name] = e.split("/");
  profiles.push({ name, commands: [cmd("run", e, name)] });
  profiles[0].commands.push(cmd(name, e, "main"));
}

const global = {
  scope: "",
  name: "",
  version: "",
  license: "",
  description: "",
  git: "",
  website: "",
  dependencies: [],
  system: null,
  platforms: [],
  dist: [],
  tags: [],
  profiles,
  hooks: [
    { command: "aux4:pkger/install", after: ["aux4 aux4 pkger reindex"] },
    { command: "aux4:pkger/uninstall", after: ["aux4 aux4 pkger reindex"] },
  ],
};

fs.writeFileSync(
  path.join(pkgs, "all.json"),
  JSON.stringify({ packages, dependencies, systemDependencies: {} }, null, 2) +
    "\n"
);
fs.writeFileSync(
  path.join(cfg, "global.aux4"),
  JSON.stringify(global, null, 2) + "\n"
);
for (const p of Object.keys(packages)) {
  fs.mkdirSync(path.join(pkgs, ...p.split("/")), { recursive: true });
  fs.writeFileSync(path.join(pkgs, ...p.split("/"), ".aux4"), "{}");
}
