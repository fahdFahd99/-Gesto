import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {createConnection} from '../runtime/database.mjs';
import {migrate} from '../runtime/migrate.mjs';
export async function harness(name){
 await mkdir('.test-runtime',{recursive:true});const folder=await mkdtemp(join(process.cwd(),'.test-runtime',name+'-'));
 for(const name of ['ingredients','domain','access','auth','seed','service','v9-service','registration','accounting','http-security']){
  const source=await readFile(`lib/${name}.ts`,'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from '(\.\/[^']+)'/g,"from '$1.mjs'");
  await writeFile(join(folder,name+'.mjs'),output.replace(/from '\.\.\/runtime\/([^']+)'/g,(_,name)=>"from '"+pathToFileURL(resolve('runtime',name)).href+"'"));
 }
 const db=createConnection({url:'file:'+join(folder,'test.db')});await migrate(db);
 const modules={};for(const n of ['domain','auth','seed','service','registration','accounting','http-security'])modules[n]=await import(pathToFileURL(join(folder,n+'.mjs')).href);
 await modules.seed.initialize(db);
 return {db,modules,folder,async close(){await db.close();await rm(folder,{recursive:true,force:true});}};
}
