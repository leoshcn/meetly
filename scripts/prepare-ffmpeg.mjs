#!/usr/bin/env node
/**
 * Download pinned FFmpeg essentials into a local cache, then stage
 * src-tauri/binaries/ffmpeg-<target-triple>.exe for Tauri externalBin.
 *
 * Cache hit skips the network download (CI: pair with actions/cache on the cache dir).
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, copyFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const pin = JSON.parse(readFileSync(join(__dirname, "ffmpeg-pin.json"), "utf8"));

const cacheDir = join(root, "third_party", "ffmpeg-cache", pin.version);
const archivePath = join(cacheDir, pin.archiveName);
const extractDir = join(cacheDir, "extract");
const binariesDir = join(root, "src-tauri", "binaries");

function hostTriple() {
  try {
    return execFileSync("rustc", ["--print", "host-tuple"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "x86_64-pc-windows-msvc";
  }
}

function findFfmpegExe(dir) {
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const name of readdirSync(cur)) {
      const full = join(cur, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (name.toLowerCase() === "ffmpeg.exe") {
        return full;
      }
    }
  }
  return null;
}

async function download(url, dest) {
  console.log(`Downloading FFmpeg ${pin.version}…`);
  console.log(`  ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`);
  }
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.partial`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
  const { renameSync } = await import("node:fs");
  renameSync(tmp, dest);
  console.log(`  saved ${dest}`);
}

function extractZip(zipPath, outDir) {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });
  // Windows 10+ and Unix: tar can extract zip
  execFileSync("tar", ["-xf", zipPath, "-C", outDir], { stdio: "inherit" });
}

async function main() {
  mkdirSync(cacheDir, { recursive: true });

  if (!existsSync(archivePath)) {
    await download(pin.url, archivePath);
  } else {
    console.log(`Cache hit: ${archivePath}`);
  }

  const cachedExe = existsSync(extractDir) ? findFfmpegExe(extractDir) : null;
  if (!cachedExe) {
    console.log("Extracting archive…");
    extractZip(archivePath, extractDir);
  } else {
    console.log(`Cache hit (extracted): ${cachedExe}`);
  }

  const exe = findFfmpegExe(extractDir);
  if (!exe) {
    throw new Error("ffmpeg.exe not found inside essentials archive");
  }

  const triple = hostTriple();
  mkdirSync(binariesDir, { recursive: true });
  const staged = join(binariesDir, `ffmpeg-${triple}.exe`);
  copyFileSync(exe, staged);
  console.log(`Staged for Tauri externalBin:\n  ${staged}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
