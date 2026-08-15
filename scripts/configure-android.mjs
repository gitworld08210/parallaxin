#!/usr/bin/env node
// Applies the app's Android requirements to the generated native project.
//
// `npx cap add android` produces a manifest with only INTERNET. This app also
// needs camera and microphone access for live streaming, calls and story
// capture, so those permissions are injected here.
//
// The native project is generated rather than committed, so this runs after
// every `cap add`/`cap sync`. It is idempotent: re-running makes no changes.

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { argv, exit } from "node:process";

const DEFAULT_MANIFEST = "android/app/src/main/AndroidManifest.xml";

// Rationale is kept next to each permission so a reviewer can tell why the app
// asks for it. Anything not justified here should not be added.
const REQUIRED_PERMISSIONS = [
  ["android.permission.INTERNET", "Firestore, Firebase Auth, LiveKit, Cloudinary"],
  ["android.permission.ACCESS_NETWORK_STATE", "detect connectivity loss during a live stream or call"],
  ["android.permission.CAMERA", "live broadcasting, video calls, story and reel capture"],
  ["android.permission.RECORD_AUDIO", "voice and video calls, voice messages, live audio"],
  ["android.permission.MODIFY_AUDIO_SETTINGS", "route call audio between speaker and earpiece"],
];

const manifestPath = argv[2] || DEFAULT_MANIFEST;

if (!existsSync(manifestPath)) {
  console.error(`✗ Manifest not found at ${manifestPath}`);
  console.error("  Run `npx cap add android` first, then re-run this script.");
  exit(1);
}

const original = await readFile(manifestPath, "utf8");

const missing = REQUIRED_PERMISSIONS.filter(([name]) => !original.includes(`android:name="${name}"`));

if (missing.length === 0) {
  console.log(`✓ ${manifestPath} already grants all ${REQUIRED_PERMISSIONS.length} required permissions`);
  exit(0);
}

// Permissions are children of <manifest>, so anchor on the closing tag rather
// than guessing where existing <uses-permission> lines sit.
const closingTag = "</manifest>";
if (!original.includes(closingTag)) {
  console.error(`✗ ${manifestPath} has no ${closingTag} element; refusing to edit a file this unexpected`);
  exit(1);
}

const block = [
  "",
  "    <!-- Added by scripts/configure-android.mjs -->",
  ...missing.map(([name, why]) => `    <!-- ${why} -->\n    <uses-permission android:name="${name}" />`),
  "",
].join("\n");

const updated = original.replace(closingTag, `${block}${closingTag}`);

await writeFile(manifestPath, updated, "utf8");

console.log(`✓ Added ${missing.length} permission(s) to ${manifestPath}:`);
for (const [name] of missing) console.log(`    ${name}`);
