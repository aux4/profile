// Test helper: simulate what `pkger install` does to the ACTIVE profile —
// add a package entry to its all.json + a command fragment to its global.aux4
// and create the shared package dir. Lets the install hooks be exercised
// without a real pkger. Usage: node fake-install.mjs <scope/name>
import fs from "node:fs";
import path from "node:path";

const cfg = path.join(process.env.HOME, ".aux4.config");
const active = path.basename(
  path.dirname(fs.readlinkSync(path.join(cfg, "global.aux4")))
);
const allPath = path.join(cfg, "profiles", active, "all.json");
const globalPath = path.join(cfg, "profiles", active, "global.aux4");

const sn = process.argv[2];
const [scope, name] = sn.split("/");
const dir = path.join(cfg, "packages", scope, name);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, ".aux4"), "{}");

const all = JSON.parse(fs.readFileSync(allPath, "utf8"));
all.packages[sn] = {
  scope,
  name,
  version: "1.0.0",
  license: "MIT",
  url: `file:///seed/${scope}_${name}.zip`,
  sha256: { default: "seed" },
  dependencies: ["aux4/aux4"],
  system: null,
  platforms: ["darwin/arm64"],
  dist: [],
  tags: [scope, name],
};
fs.writeFileSync(allPath, JSON.stringify(all, null, 2) + "\n");

const g = JSON.parse(fs.readFileSync(globalPath, "utf8"));
const main = g.profiles.find((p) => p.name === "main");
main.commands.push({
  name,
  execute: [`echo ${name}`],
  help: { text: name },
  ref: {
    path: path.join(dir, ".aux4"),
    dir,
    package: sn + "@1.0.0",
    profile: "main",
  },
});
fs.writeFileSync(globalPath, JSON.stringify(g, null, 2) + "\n");
