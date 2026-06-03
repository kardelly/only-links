/**
 * Backfill og_image for bookmarks that don't have one.
 * Run: node scripts/backfill-images.mjs
 *
 * Processes in batches of 5, with 500ms pause between batches.
 * Safe to run multiple times (only touches NULL/empty og_image rows).
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const db = await open({ filename: './database.sqlite', driver: sqlite3.Database });

const bookmarks = await db.all(
  'SELECT id, url FROM bookmarks WHERE (og_image IS NULL OR og_image = "") ORDER BY id DESC'
);

console.log(`Found ${bookmarks.length} bookmarks without images.`);

async function fetchOgImage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,*/*'
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    const m = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']*)["']/i) ||
              html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']og:image["']/i);
    if (!m?.[1]) return null;

    let img = m[1].trim();
    if (img.startsWith('//')) img = 'https:' + img;
    else if (img.startsWith('/')) {
      const base = new URL(url);
      img = `${base.protocol}//${base.host}${img}`;
    }
    img = img.replace(/^http:\/\//, 'https://');
    if (!img.startsWith('https://')) return null;
    return img;
  } catch {
    return null;
  }
}

const BATCH = 5;
let updated = 0;
let failed = 0;

for (let i = 0; i < bookmarks.length; i += BATCH) {
  const batch = bookmarks.slice(i, i + BATCH);
  await Promise.allSettled(batch.map(async ({ id, url }) => {
    const img = await fetchOgImage(url);
    if (img) {
      await db.run('UPDATE bookmarks SET og_image = ? WHERE id = ?', [img, id]);
      updated++;
      process.stdout.write(`  ✓ ${id} — ${img.substring(0, 60)}\n`);
    } else {
      failed++;
    }
  }));

  const done = Math.min(i + BATCH, bookmarks.length);
  console.log(`Progress: ${done}/${bookmarks.length} (updated: ${updated}, skipped: ${failed})`);

  if (i + BATCH < bookmarks.length) {
    await new Promise(r => setTimeout(r, 500));
  }
}

await db.close();
console.log(`\nDone. Updated: ${updated} / ${bookmarks.length}`);
