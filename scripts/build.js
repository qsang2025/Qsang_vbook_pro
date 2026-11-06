#!/usr/bin/env node
/**
 * Extension Builder for Qsang_vbook_pro.
 * Zero external dependencies.
 *
 * Enforces vBook engine constraints:
 *  - vBook load() only loads files at top-level of src/ within the same extension.
 *  - This script scans all load('libName.js') calls and automatically copies needed
 *    files from repo root lib/ into the extension's src/ before creating plugin.zip.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");

function getRepoRoot() {
  return path.resolve(__dirname, "..");
}

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

/**
 * Pure Node.js ZIP archive generator (standard PKZIP format with DEFLATE).
 * Ensures zero-dependency builds on any platform without requiring external binaries.
 */
function createZipArchive(files, outputPath) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name.replace(/\\/g, "/"), "utf8");
    const isDeflated = file.data.length > 0;
    const compressed = isDeflated ? zlib.deflateRawSync(file.data) : Buffer.alloc(0);
    const crc = crc32(file.data);

    // Local file header (30 bytes + name)
    const local = Buffer.alloc(30 + filenameBuf.length);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4);         // version needed (2.0)
    local.writeUInt16LE(0, 6);          // flags
    local.writeUInt16LE(isDeflated ? 8 : 0, 8); // compression: 8=deflate, 0=store
    local.writeUInt16LE(0, 10);         // mod time
    local.writeUInt16LE(0, 12);         // mod date
    local.writeUInt32LE(crc, 14);       // crc-32
    local.writeUInt32LE(compressed.length, 18); // compressed size
    local.writeUInt32LE(file.data.length, 22);   // uncompressed size
    local.writeUInt16LE(filenameBuf.length, 26); // file name length
    local.writeUInt16LE(0, 28);                  // extra field length
    filenameBuf.copy(local, 30);

    localHeaders.push(local, compressed);

    // Central directory header (46 bytes + name)
    const central = Buffer.alloc(46 + filenameBuf.length);
    central.writeUInt32LE(0x02014b50, 0); // signature
    central.writeUInt16LE(20, 4);         // version made by
    central.writeUInt16LE(20, 6);         // version needed
    central.writeUInt16LE(0, 8);          // flags
    central.writeUInt16LE(isDeflated ? 8 : 0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(filenameBuf.length, 28);
    central.writeUInt16LE(0, 30);         // extra length
    central.writeUInt16LE(0, 32);         // comment length
    central.writeUInt16LE(0, 34);         // disk number start
    central.writeUInt16LE(0, 36);         // internal file attributes
    central.writeUInt32LE(0, 38);         // external file attributes
    central.writeUInt32LE(offset, 42);    // relative offset of local header
    filenameBuf.copy(central, 46);

    centralHeaders.push(central);
    offset += local.length + compressed.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const c of centralHeaders) centralDirSize += c.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4);          // disk number
  eocd.writeUInt16LE(0, 6);          // disk with central dir
  eocd.writeUInt16LE(files.length, 8); // entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  const allBuffers = localHeaders.concat(centralHeaders, [eocd]);
  const finalZip = Buffer.concat(allBuffers);
  fs.writeFileSync(outputPath, finalZip);
}

// CRC32 implementation for ZIP
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

/**
 * Builds a single extension:
 * 1. Checks all load('...') in src/*.js
 * 2. Copies required lib files into src/ if missing
 * 3. Packages into plugin.zip
 */
function buildExtension(extDir) {
  const repoRoot = getRepoRoot();
  const libDir = path.join(repoRoot, "lib");
  const srcDir = path.join(extDir, "src");
  const pluginJsonPath = path.join(extDir, "plugin.json");
  const iconPath = path.join(extDir, "icon.png");
  const zipPath = path.join(extDir, "plugin.zip");

  if (!fs.existsSync(pluginJsonPath)) {
    throw new Error("Missing plugin.json in " + extDir);
  }
  if (!fs.existsSync(srcDir)) {
    throw new Error("Missing src/ directory in " + extDir);
  }

  // Scan for loaded library files
  const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith(".js"));
  const loadedLibs = new Set();
  const loadRegex = /load\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const sf of srcFiles) {
    const code = fs.readFileSync(path.join(srcDir, sf), "utf8");
    let match;
    while ((match = loadRegex.exec(code)) !== null) {
      loadedLibs.add(match[1]);
    }
  }

  // Copy missing libraries from lib/ into src/
  const copiedLibs = [];
  for (const libName of loadedLibs) {
    const destPath = path.join(srcDir, libName);
    if (!fs.existsSync(destPath)) {
      const sourceLib = path.join(libDir, libName);
      if (fs.existsSync(sourceLib)) {
        fs.copyFileSync(sourceLib, destPath);
        copiedLibs.push(libName);
      } else {
        console.warn(`[WARN] Extension requires load('${libName}') but it was not found in lib/ or src/`);
      }
    }
  }

  // Collect files to package into zip
  const filesToZip = [];
  filesToZip.push({
    name: "plugin.json",
    data: fs.readFileSync(pluginJsonPath)
  });

  if (fs.existsSync(iconPath)) {
    filesToZip.push({
      name: "icon.png",
      data: fs.readFileSync(iconPath)
    });
  }

  // Add all files currently in src/
  const updatedSrcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith(".js"));
  for (const sf of updatedSrcFiles) {
    filesToZip.push({
      name: "src/" + sf,
      data: fs.readFileSync(path.join(srcDir, sf))
    });
  }

  createZipArchive(filesToZip, zipPath);

  const relExt = path.relative(repoRoot, extDir);
  return {
    dir: relExt,
    bundledLibs: copiedLibs,
    zipSize: fs.statSync(zipPath).size,
    filesCount: filesToZip.length
  };
}

function main() {
  const args = process.argv.slice(2);
  const target = args[0];
  const repoRoot = getRepoRoot();

  let extDirs = [];
  if (target) {
    const resolved = path.resolve(process.cwd(), target);
    if (fs.existsSync(path.join(resolved, "plugin.json"))) {
      extDirs = [resolved];
    } else {
      extDirs = findExtensions(resolved);
    }
  } else {
    extDirs = findExtensions();
  }

  if (extDirs.length === 0) {
    console.log("No extensions found to build.");
    return;
  }

  console.log(`Building ${extDirs.length} extension(s)...`);
  let built = 0;
  for (const d of extDirs) {
    try {
      const info = buildExtension(d);
      const libNote = info.bundledLibs.length > 0 ? ` (inlined libs: ${info.bundledLibs.join(", ")})` : "";
      console.log(`[OK] Built ${info.dir} -> plugin.zip (${info.zipSize} bytes)${libNote}`);
      built++;
    } catch (err) {
      console.error(`[ERROR] Failed to build ${d}:`, err.message);
    }
  }
  console.log(`Successfully built ${built}/${extDirs.length} extensions.`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildExtension,
  findExtensions,
  createZipArchive
};
