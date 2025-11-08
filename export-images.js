#!/usr/bin/env node
/**
 * export-images.js — scaffold poster triplets (jpg/mp4/webm)
 * Usage: node tools/export-images.js
 */

import fs from "node:fs";
import path from "node:path";

const posters = [
  "poster-01-start",
  "poster-02-mode",
  "poster-03-reward",
  "poster-04-reflection",
  "poster-05-upgrade",
  "poster-06-challenge",
  "poster-07-pro",
  "poster-08-levelup",
  "poster-09-community",
  "poster-10-brand",
  "poster-success",
  "poster-gameover",
  "poster-night",
  "poster-level2",
  "poster-level3"
];

// Use v1 subfolder for consistency
const dir = path.resolve("media/posters/v1");

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Created directory: ${dir}`);
}

let created = 0;
let skipped = 0;

for (const name of posters) {
  for (const ext of [".jpg", ".mp4", ".webm"]) {
    const filePath = path.join(dir, name + ext);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "");
      created++;
      console.log(`Created: ${filePath}`);
    } else {
      skipped++;
    }
  }
}

console.log(`\nScaffold complete — ${created} new file(s), ${skipped} existing.`);
console.log("Replace the zero-byte files with exported design assets.\n");
