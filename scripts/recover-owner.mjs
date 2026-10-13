import {scrypt,randomBytes} from 'node:crypto';
import {promisify} from 'node:util';
import {createInterface} from 'node:readline';
import {createConnection,connectionConfig} from '../runtime/database.mjs';
async function prompt(label,secret=false){
 if(!process.stdin.isTTY)throw new Error('Utilisez un terminal interactif.');
 if(!secret){const rl=createInterface({input:process.stdin,output:process.stdout});try{return await new Promise(resolve=>rl.question(label,resolve));}finally{rl.close();}}
 process.stdout.write(label);process.stdin.setRawMode(true);process.stdin.resume();
 return new Promise((resolve,reject)=>{let value='';const finish=()=>{process.stdin.off('data',key);process.stdin.setRawMode(false);process.stdin.pause();};const key=buffer=>{const s=buffer.toString();if(s==='\u0003'){finish();reject(new Error('Annulé'));}else if(s==='\r'||s==='\n'){finish();process.stdout.write('\n');resolve(value);}else if(s==='\u007f'||s==='\b')value=value.slice(0,-1);else if(!/[\x00-\x1f]/.test(s))value+=s;};process.stdin.on('data',key);});
}
const config=connectionConfig(),db=createConnection(config);
try{
 const owner=await db.prepare("SELECT id,name FROM employees WHERE role='owner'").first();if(!owner)throw new Error('Aucun titulaire. Utilisez Créer un compte dans le site.');
 console.log('Récupération du titulaire : '+owner.name+' · '+(config.url.startsWith('file:')?'base locale':'BASE DISTANTE'));
 if(await prompt('Tapez RECUPERER pour révoquer les sessions et changer le mot de passe : ')!=='RECUPERER')throw new Error('Annulé.');
 const password=await prompt('Nouveau mot de passe (15 caractères minimum, masqué) : ',true),confirmation=await prompt('Confirmez le mot de passe : ',true);
 if(password!==confirmation||password.length<15||password.length>128)throw new Error('Confirmation ou longueur incorrecte.');
 const salt=randomBytes(24).toString('hex'),key=await promisify(scrypt)(password,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024});
 await db.batch([db.prepare('UPDATE employees SET passwordHash=?,version=version+1 WHERE id=?').bind(`scrypt:32768:8:3:${salt}:${key.toString('hex')}`,owner.id),db.prepare('DELETE FROM sessions WHERE employeeId=?').bind(owner.id),db.prepare('INSERT INTO audit (id,operatorId,operatorName,action,reference,detail,createdAt) VALUES (?,?,?,?,?,?,?)').bind(randomBytes(16).toString('hex'),owner.id,owner.name,'account.recovered',owner.id,'Récupération depuis le terminal administrateur',new Date().toISOString())]);
 console.log('Mot de passe changé. Toutes les sessions du titulaire sont révoquées.');
}finally{await db.close();}
