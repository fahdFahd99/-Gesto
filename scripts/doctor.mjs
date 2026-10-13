import {access} from 'node:fs/promises';
import {loadEnvironment,localDatabasePath} from '../runtime/prepare.mjs';
import {createConnection,connectionConfig} from '../runtime/database.mjs';
import {ConfigurationError,configuredOrigin} from '../runtime/config.mjs';
import {databaseFailure,inspectSchema} from '../runtime/diagnostics.mjs';
await loadEnvironment();
let db;
try {
  const config=connectionConfig();
  if(process.argv.includes('--netlify')&&config.url.startsWith('file:'))throw new ConfigurationError('DATABASE_LOCAL_ON_NETLIFY','Netlify exige une base distante.');
  configuredOrigin();
  console.log('PASS : DATABASE_URL, jeton distant et APP_ORIGIN configurés.');
  if(config.url.startsWith('file:'))await access(localDatabasePath(config.url));
  db=createConnection(config);
  const status=await inspectSchema(db);
  if(status.firstAccount&&!/^[a-f0-9]{64}$/i.test(process.env.SETUP_TOKEN||''))throw new ConfigurationError('SETUP_TOKEN_INVALID','Code privé du premier compte absent ou invalide.');
  console.log('PASS : connexion SQL, schéma et ouverture des comptes.');
  console.log('Contrôle sans modification des données terminé. Tester ensuite le domaine réellement publié et la persistance.');
}catch(error){
  const issue=databaseFailure(error);
  console.error(`FAIL [${issue.code}] ${issue.error}`);
  if(error.name==='ConfigurationError')console.error(error.message);
  console.error('Consultez docs/DEPANNAGE_503.md.');process.exitCode=1;
}finally{if(db)await db.close();}
