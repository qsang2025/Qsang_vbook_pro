#!/usr/bin/env node
/**
 * Unified CLI for Qsang_vbook_pro.
 * Zero external dependencies.
 *
 * Usage:
 *   node scripts/cli.js validate        Run static analysis & Rhino ES6 linter
 *   node scripts/cli.js build [ext]     Bundle required lib/ files and package plugin.zip
 *   node scripts/cli.js build-catalog   Regenerate root plugin.json registry
 *   node scripts/cli.js health-check    Run connectivity & golden fixture checks, update STATUS.md
 *   node scripts/cli.js connect         Ping developer server on phone/emulator
 *   node scripts/cli.js test <ext> ...  Run script test on developer server
 */

const { spawnSync } = require("child_process");
const path = require("path");

const cmd = process.argv[2];
const restArgs = process.argv.slice(3);

function runScript(scriptName, args = []) {
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit"
  });
  process.exit(result.status);
}

switch (cmd) {
  case "validate":
    runScript("validate.js", restArgs);
    break;
  case "build":
    runScript("build.js", restArgs);
    break;
  case "build-catalog":
    runScript("build-catalog.js", restArgs);
    break;
  case "health-check":
    runScript("health-check.js", restArgs);
    break;
  case "connect":
  case "test":
  case "testall":
  case "install":
    runScript("vbook.js", [cmd, ...restArgs]);
    break;
  default:
    console.log(`
Qsang_vbook_pro CLI

Available commands:
  validate         Validate manifest schema, Rhino ES6 compliance, and lib dependencies
  build [ext]      Copy required lib/ dependencies and package plugin.zip
  build-catalog    Scan extensions/ and update root plugin.json registry
  health-check     Run scheduled health probes, evaluate golden fixtures, and update STATUS.md
  connect          Check connection to vBook Dev Server on phone
  test <ext> <s..> Test script against local vBook Dev Server
  install <ext>    Build and install extension directly to vBook app
`);
    process.exit(cmd ? 1 : 0);
}
