import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
export async function migrate(db, directory = resolve('drizzle')) {
  const tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()).results;
  if(tables.length && !tables.some(t=>t.name==='app_migrations')) throw new Error('MIGRATIONS_UNTRACKED : base existante sans historique reconnu. Aucune modification effectuée. Suivre docs/MIGRATIONS.md après sauvegarde.');
  await db.prepare('CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, appliedAt TEXT NOT NULL)').run();
  const applied = [];
  for (const name of (await readdir(directory)).filter(x => /^\d{4}_.+\.sql$/.test(x)).sort()) {
    const source = await readFile(resolve(directory,name),'utf8');
    const checksum = createHash('sha256').update(source).digest('hex');
    const old = await db.prepare('SELECT checksum FROM app_migrations WHERE name=?').bind(name).first();
    if(old) { if(old.checksum!==checksum) throw new Error('Migration déjà appliquée mais modifiée : '+name); continue; }
    const statements = source.split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean).map(sql=>db.prepare(sql));
    statements.push(db.prepare('INSERT INTO app_migrations (name,checksum,appliedAt) VALUES (?,?,?)').bind(name,checksum,new Date().toISOString()));
    await db.batch(statements);
    applied.push(name);
  }
  return applied;
}
