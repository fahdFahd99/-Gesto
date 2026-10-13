import {writeFile} from 'node:fs/promises';
import {createConnection,connectionConfig} from '../runtime/database.mjs';
const db=createConnection(connectionConfig());
const names=['settings','taxes','suppliers','products','lots','movements','receipts','sales','saleLines','receiptLines','returns','returnLines','quarantine','drafts','audit'];
const target=process.argv[2]||`pharmacie-backup-${new Date().toISOString().replaceAll(':','-')}.json`;
try{
 const result=await db.batch(names.map(t=>db.prepare(`SELECT * FROM ${t}`)));
 const backup={format:'pharmacie-ijjai-business-v9',schemaVersion:11,createdAt:new Date().toISOString(),tables:Object.fromEntries(names.map((n,i)=>[n,result[i].results]))};
 await writeFile(target,JSON.stringify(backup,null,2),{flag:'wx',mode:0o600});console.log('Sauvegarde créée : '+target);
}finally{await db.close();}
