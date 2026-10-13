import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {prepareRuntime} from '../runtime/prepare.mjs';
import {databaseFailure} from '../runtime/diagnostics.mjs';
const command=process.argv[2];
if(!['dev','start'].includes(command))throw new Error('Commande attendue : dev ou start.');
process.env.NODE_ENV=command==='dev'?'development':'production';
const args=process.argv.slice(3);
const portIndex=args.findIndex(v=>v==='--port'||v==='-p');
const port=Number(portIndex>=0?args[portIndex+1]:process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Port invalide.');
try {await prepareRuntime({port});}
catch(error) {
  const issue=databaseFailure(error);
  console.error(`Démarrage interrompu [${issue.code}]. ${issue.error}`);
  if(error.name==='ConfigurationError'||String(error.message).startsWith('MIGRATIONS_UNTRACKED'))console.error(error.message);
  console.error('Voir docs/DEPANNAGE_503.md. Aucune donnée existante n’a été remplacée.');
  process.exit(1);
}
const require=createRequire(import.meta.url);
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),command,...args],{stdio:'inherit',env:process.env});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
