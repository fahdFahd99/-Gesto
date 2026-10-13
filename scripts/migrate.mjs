import { mkdir } from 'node:fs/promises';
import { createConnection,connectionConfig } from '../runtime/database.mjs';
import { migrate } from '../runtime/migrate.mjs';
await mkdir('data',{recursive:true});
const config=connectionConfig();
const db=createConnection(config);
try { const files=await migrate(db);console.log(files.length?'Migrations appliquées : '+files.join(', '):'Base à jour.'); }
finally {await db.close();}
