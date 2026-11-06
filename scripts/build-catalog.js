#!/usr/bin/env node
/**
 * Catalog / Registry Builder for Qsang_vbook_pro.
 * Automatically scans extensions/ directory and updates root plugin.json registry.
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

function buildCatalog() {
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
    } catch (e) {
      // Keep defaults
    }
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

  // Sort alphabetically by name
  catalogEntries.sort((a, b) => a.name.localeCompare(b.name));
  rootCatalog.data = catalogEntries;

  fs.writeFileSync(rootPluginPath, JSON.stringify(rootCatalog, null, 2) + "\n", "utf8");
  console.log(`[OK] Catalog regenerated: ${catalogEntries.length} extension(s) indexed in plugin.json.`);
  return catalogEntries;
}

if (require.main === module) {
  buildCatalog();
}

module.exports = {
  buildCatalog
};
