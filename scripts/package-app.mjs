#!/usr/bin/env node
/**
 * Builds a clean, secret-free distribution of the app: dist/24h-work-dashboard/
 * (+ ZIP when possible). Includes oauth-client.json so recipients get the
 * one-click Google sign-in; EXCLUDES data/ (tokens!), .env*, node_modules, .next.
 *
 * Usage: npm run package
 */
import { promises as fs } from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(root, "dist");
const APP_DIR = path.join(OUT_DIR, "24h-work-dashboard");

const INCLUDE_DIRS = ["app", "components", "lib", "scripts", "docs"];
const INCLUDE_FILES = [
  "package.json",
  "tsconfig.json",
  "next.config.mjs",
  "tailwind.config.ts",
  "postcss.config.mjs",
  ".env.local.example",
  ".gitignore",
  "start.bat",
  "start.sh",
  "README.md",
  "CLAUDE.md",
  "QA-REPORT.md",
  "oauth-client.json", // ships the one-click Google sign-in
];

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  for (const e of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

await fs.rm(OUT_DIR, { recursive: true, force: true });
await fs.mkdir(APP_DIR, { recursive: true });

let copied = 0;
for (const d of INCLUDE_DIRS) {
  try {
    await copyDir(path.join(root, d), path.join(APP_DIR, d));
    copied++;
  } catch {
    /* optional dir */
  }
}
let missingOauth = false;
for (const f of INCLUDE_FILES) {
  try {
    await fs.copyFile(path.join(root, f), path.join(APP_DIR, f));
    copied++;
  } catch {
    if (f === "oauth-client.json") missingOauth = true;
  }
}

// Safety net: never ship secrets even if include lists change later.
for (const forbidden of ["data", ".env.local", ".env", "node_modules", ".next"]) {
  await fs.rm(path.join(APP_DIR, forbidden), { recursive: true, force: true });
}

// Try to ZIP (PowerShell on Windows, zip elsewhere); folder remains either way.
let zipped = "";
const zipPath = path.join(OUT_DIR, "24h-work-dashboard.zip");
try {
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${APP_DIR}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: "ignore" }
    );
  } else {
    execSync(`cd '${OUT_DIR}' && zip -qr 24h-work-dashboard.zip 24h-work-dashboard`, {
      stdio: "ignore",
      shell: "/bin/bash",
    });
  }
  zipped = zipPath;
} catch {
  /* zip tooling unavailable — folder output is enough */
}

console.log(`Distribution ready: ${APP_DIR}`);
if (zipped) console.log(`ZIP: ${zipped}`);
if (missingOauth) {
  console.warn(
    "\nWARNING: oauth-client.json not found — recipients will NOT get the one-click " +
      "Google sign-in (only the advanced Service Account mode). See README section 'הפצה'."
  );
}