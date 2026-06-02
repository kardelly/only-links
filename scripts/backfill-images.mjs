/**
 * Backfill og_image for all bookmarks that don't have one.
 *
 * Usage (on the server):
 *   node scripts/backfill-images.mjs
 *   node scripts/backfill-images.mjs --dry-run   # count only, no updates
 *   node scripts/backfill-images.mjs --user 1    # single user
 */

import { dbPromise } from '../database.js';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const USER_ID = (() => {
  const idx = args.indexOf('--user');
  return idx !== -1 ? parseInt(args[idx + 1]) : null;
})();

const BATCH = 5;
const DELAY_MS = 200;

async function fetchMeta(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OnlyLinks/1.0)' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (!match) return null;
    let img = match[1].trim();
    if (img.startsWith('//')) img = 'https:' + img;
    if (img.startsWith('/')) {
      const base = new URL(url);
      img = `${base.protocol}//${base.host}${img}`;
    }
    if (img.startsWith('http://')) img = img.replace('http://', 'https://');
    return img || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function run() {
  const db = await dbPromise;

  const where = USER_ID
    ? 'WHERE (og_image IS NULL OR og_image = "") AND user_id = ?'
    : 'WHERE (og_image IS NULL OR og_image = "")';
  const params = USER_ID ? [USER_ID] : [];

  const bookmarks = await db.all(`SELECT id, url, user_id FROM bookmarks ${where}`, params);

  console.log(`\nBookmarks without image: ${bookmarks.length}${DRY_RUN ? ' (dry run)' : ''}`);
  if (DRY_RUN || bookmarks.length === 0) { process.exit(0); }

  let updated = 0, failed = 0;

  for (let i = 0; i < bookmarks.length; i += BATCH) {
    const batch = bookmarks.slice(i, i + BATCH);
    await Promise.allSettled(batch.map(async (bm) => {
      const img = await fetchMeta(bm.url);
      if (img) {
        await db.run('UPDATE bookmarks SET og_image = ? WHERE id = ?', [img, bm.id]);
        updated++;
        process.stdout.write(`  ✓ [${bm.id}] ${img.slice(0, 60)}\n`);
      } else {
        failed++;
      }
    }));

    const pct = Math.round(((i + batch.length) / bookmarks.length) * 100);
    process.stdout.write(`  Progress: ${i + batch.length}/${bookmarks.length} (${pct}%) — ${updated} updated\r`);

    if (i + BATCH < bookmarks.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n\nDone. Updated: ${updated} | No image found: ${failed} | Total: ${bookmarks.length}`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
