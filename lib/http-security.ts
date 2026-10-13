import {DomainError} from './domain';
import {configuredOrigin} from '../runtime/config.mjs';
export function verifyOrigin(request:Request){
 const target=configuredOrigin();
 const origin=request.headers.get('origin');
 const fetchSite=request.headers.get('sec-fetch-site');
 if(origin!==target||fetchSite==='cross-site')throw new DomainError('Origine non autorisée.',403);
}
export async function readJson(request:Request){
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new DomainError('Format JSON requis.',415);
 const limit=100000;
 if(Number(request.headers.get('content-length')||0)>limit)throw new DomainError('La requête est trop volumineuse.',413);
 const reader=request.body?.getReader();if(!reader)throw new DomainError('JSON requis.');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new DomainError('La requête est trop volumineuse.',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new DomainError('JSON invalide.');}
}
