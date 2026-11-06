#!/usr/bin/env node
/**
 * Catalog / Registry Builder for Qsang_vbook_pro.
 * Automatically scans extensions/ directory and updates root plugin.json registry.
 * Supports --check flag for CI / pre-commit validation.
 * Zero external dependencies.
 */

const fs = require("fs");
const path = require("path");

function getRepoRoot() {
  return path.resolve(__dirname, "..");
}

const GITHUB_REPO = "qsang2025/Qsang_vbook_pro";
const DEFAULT_BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/${DEFAULT_BRANCH}`;

function findExtensions(startDir) {
  const root = startDir || path.join(getRepoRoot(), "extensions");
  const results = [];

  function walk(current) {
    if (!fs.existsSync(current)) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    const hasPlugin = fs.existsSync(path.join(current, "plugin.json"));
    const hasSrc = fs.existsSync(path.join(current, "src")) && fs.statSync(path.join(current, "src")).isDirectory();

    if (hasPlugin && hasSrc && current !== getRepoRoot()) {
      results.push(current);
      return;
    }

    for (const ent of entries) {
      if (ent.isDirectory() && ent.name !== "node_modules" && ent.name !== ".git") {
        walk(path.join(current, ent.name));
      }
    }
  }

  walk(root);
  return results.sort();
}

function buildCatalog(checkOnly = false) {
  const repoRoot = getRepoRoot();
  const rootPluginPath = path.join(repoRoot, "plugin.json");
  const extDirs = findExtensions();

  let rootCatalog = {
    metadata: {
      author: "Qsang",
      description: "Professional vBook Extensions Registry"
    },
    data: []
  };

  if (fs.existsSync(rootPluginPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(rootPluginPath, "utf8"));
      if (existing.metadata) rootCatalog.metadata = existing.metadata;
    } catch (e) {}
  }

  const catalogEntries = [];

  for (const extDir of extDirs) {
    const pjPath = path.join(extDir, "plugin.json");
    try {
      const manifest = JSON.parse(fs.readFileSync(pjPath, "utf8"));
      const meta = manifest.metadata || {};
      const relPath = path.relative(repoRoot, extDir).replace(/\\/g, "/");

      const entry = {
        name: meta.name || path.basename(extDir),
        author: meta.author || "vBook",
        path: `${RAW_BASE}/${relPath}/plugin.zip`,
        version: meta.version || 1,
        source: meta.source || "",
        icon: `${RAW_BASE}/${relPath}/icon.png`,
        description: meta.description || "",
        type: meta.type || "novel",
        locale: meta.locale || "vi_VN"
      };

      catalogEntries.push(entry);
    } catch (err) {
      console.error(`[WARN] Skipping invalid manifest in ${extDir}: ${err.message}`);
    }
  }

  catalogEntries.sort((a, b) => a.name.localeCompare(b.name));
  rootCatalog.data = catalogEntries;
  const newJsonStr = JSON.stringify(rootCatalog, null, 2) + "\n";

  if (checkOnly) {
    if (!fs.existsSync(rootPluginPath)) {
      console.error("[FAIL] plugin.json does not exist at repo root.");
      process.exit(1);
    }
    const currentStr = fs.readFileSync(rootPluginPath, "utf8");
    if (currentStr.trim() !== newJsonStr.trim()) {
      console.error("[FAIL] Root plugin.json is out of date! Run: node scripts/cli.js build-catalog");
      process.exit(1);
    }
    console.log(`[OK] Registry check passed: ${catalogEntries.length} extension(s) in sync.`);
    return catalogEntries;
  }

  fs.writeFileSync(rootPluginPath, newJsonStr, "utf8");
  console.log(`[OK] Catalog regenerated: ${catalogEntries.length} extension(s) indexed in plugin.json.`);
  return catalogEntries;
}

if (require.main === module) {
  const checkOnly = process.argv.includes("--check");
  buildCatalog(checkOnly);
}

module.exports = {
  buildCatalog
};
