/**
 * Remove specific tags from the database.
 * Deletes from bookmark_tags and tags tables.
 * Does NOT delete the bookmarks themselves.
 *
 * Usage: node scripts/remove-tags.mjs
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const TAGS_TO_REMOVE = [
  'kifi',
  'anderson facanha',
  'private discussions',
  'unorganized',
  "@kardelly's twitter links",
];

const db = await open({ filename: './database.sqlite', driver: sqlite3.Database });

for (const tagName of TAGS_TO_REMOVE) {
  const tag = await db.get('SELECT id FROM tags WHERE name = ?', [tagName]);
  if (!tag) {
    console.log(`  NOT FOUND: "${tagName}"`);
    continue;
  }

  const { count } = await db.get(
    'SELECT COUNT(*) as count FROM bookmark_tags WHERE tag_id = ?',
    [tag.id]
  );

  await db.run('DELETE FROM bookmark_tags WHERE tag_id = ?', [tag.id]);
  await db.run('DELETE FROM tags WHERE id = ?', [tag.id]);

  console.log(`  REMOVED: "${tagName}" (id=${tag.id}, was on ${count} bookmarks)`);
}

await db.close();
console.log('\nDone.');
