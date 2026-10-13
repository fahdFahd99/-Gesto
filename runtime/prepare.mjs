import {randomBytes} from 'node:crypto';
import {loadEnvFile} from 'node:process';
import {access,mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createConnection,connectionConfig} from './database.mjs';
import {ConfigurationError,configuredOrigin,isNetlify} from './config.mjs';
import {inspectSchema} from './diagnostics.mjs';
import {migrate} from './migrate.mjs';
export async function loadEnvironment() {
  const mode=process.env.NODE_ENV||'development';
  let found=false;
  for(const name of [`.env.${mode}.local`,...(mode==='test'?[]:['.env.local']),`.env.${mode}`,'.env']) {
    try {await access(name);} catch(error) {if(error.code==='ENOENT')continue;throw error;}
    loadEnvFile(name);found=true;
  }
  return found;
}
export function localDatabasePath(url) {
  if(!url.startsWith('file:')||url.includes('?')||url.includes('#')||url==='file::memory:') throw new ConfigurationError('DATABASE_URL_INVALID','Le stockage local doit être un fichier SQLite persistant.');
  return url.startsWith('file://')?fileURLToPath(url):resolve(decodeURIComponent(url.slice(5)));
}
export async function prepareRuntime({port=3000}={}) {
  const hadFile=await loadEnvironment();
  if(!process.env.DATABASE_URL&&!hadFile&&!isNetlify()) {
    if(process.env.APP_ORIGIN||process.env.DATABASE_AUTH_TOKEN)throw new ConfigurationError('DATABASE_URL_MISSING','Configuration partielle : renseignez DATABASE_URL.');
    await writeFile('.env.local',`DATABASE_URL=file:./data/pharmacie.db\nAPP_ORIGIN=http://localhost:${port}\nSETUP_TOKEN=${process.env.SETUP_TOKEN||randomBytes(32).toString('hex')}\n`,{flag:'wx',mode:0o600});
    await loadEnvironment();
    console.log('Installation locale créée. Le code privé du premier compte est dans .env.local (SETUP_TOKEN).');
  }
  const config=connectionConfig();
  configuredOrigin();
  const local=config.url.startsWith('file:');
  if(local)await mkdir(dirname(localDatabasePath(config.url)),{recursive:true});
  const db=createConnection(config);
  try {
    // Remote data is migrated only by the explicit db:migrate command.
    if(local)await migrate(db);
    const status=await inspectSchema(db);
    if(status.firstAccount&&!/^[a-f0-9]{64}$/i.test(process.env.SETUP_TOKEN||'')) throw new ConfigurationError('SETUP_TOKEN_INVALID','Premier compte : SETUP_TOKEN doit être un code privé aléatoire de 64 caractères hexadécimaux.');
    return status;
  } finally {await db.close();}
}
