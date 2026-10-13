import {readFile,open,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createConnection} from '../runtime/database.mjs';
import {migrate} from '../runtime/migrate.mjs';
const [source,target]=process.argv.slice(2);
if(!source||!target)throw new Error('Usage : node scripts/restore-backup.mjs sauvegarde.json nouvelle-base.db');
const data=JSON.parse(await readFile(source,'utf8'));
const order=['settings','taxes','suppliers','products','lots','receipts','sales','saleLines','movements','receiptLines','returns','returnLines','quarantine','drafts','audit'];
if(data.format!=='pharmacie-ijjai-business-v9'||data.schemaVersion!==11)throw new Error('Sauvegarde V11 requise. Pour une ancienne version, suivre docs/MIGRATIONS.md.');
if(Object.keys(data.tables||{}).sort().join()!==[...order].sort().join())throw new Error('Tables manquantes ou inattendues.');
// Exclusive creation: a populated database can never be overwritten.
const file=await open(target,'wx',0o600);await file.close();
const db=createConnection({url:'file:'+resolve(target)});let success=false;
try{
 await migrate(db);const statements=[];
 for(const table of order){
  const columns=new Set((await db.prepare(`PRAGMA table_info("${table}")`).all()).results.map(r=>r.name));
  if(!Array.isArray(data.tables[table]))throw new Error('Table invalide : '+table);
  for(const row of data.tables[table]){
   const keys=Object.keys(row);if(!keys.length||keys.some(k=>!columns.has(k)))throw new Error('Colonnes invalides : '+table);
   statements.push(db.prepare(`INSERT INTO "${table}" (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...keys.map(k=>row[k])));
  }
 }
 // Local database only. One transaction preserves foreign-key ordering and all-or-nothing restoration.
 await db.batch(statements);
 if((await db.prepare('PRAGMA foreign_key_check').all()).results.length)throw new Error('Intégrité référentielle invalide.');
 if(Object.values(await db.prepare('PRAGMA integrity_check').first())[0]!=='ok')throw new Error('Intégrité SQLite invalide.');
 for(const t of order)if((await db.prepare(`SELECT COUNT(*) n FROM ${t}`).first()).n!==data.tables[t].length)throw new Error('Nombre de lignes incorrect : '+t);
 success=true;console.log('Restauration vérifiée dans '+target+'. Aucun compte ni mot de passe restauré; créer le titulaire avant bascule.');
}finally{await db.close();if(!success)await unlink(target);}
