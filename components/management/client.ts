'use client';
import {useEffect,useRef,useState} from 'react';
import type {Draft} from '@/lib/domain';
export async function api(path:string,body?:unknown){const r=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(25000)});let data:any;try{data=await r.json();}catch{throw new Error('Le service ne répond pas correctement. Votre saisie est conservée.');}if(!r.ok)throw Object.assign(new Error(data.error||'Opération impossible.'),{status:r.status,code:data.code,reference:data.reference});return data;}
export function useDraft<T extends {lines:any[]}>(type:'sale'|'purchase',actorId:string,server:Draft|undefined,empty:()=>T,completedIds:string[]=[]){
 const storageKey=`ijjai-v9-${actorId}-${type}`;
 const [initialData]=useState(()=>{let saved:any;try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&completedIds.includes(saved.id)){localStorage.removeItem(storageKey);saved=null;}}catch{}
 const usable=saved&&(!server||saved.id===server.id)&&saved.version>=(server?.version??0);
 return {id:server?.id??(usable?saved.id:crypto.randomUUID()),version:server?.version??(usable?saved.version:0),payload:(usable?saved.payload:server?.payload??empty()) as T};});
 const [payload,setPayload]=useState<T>(initialData.payload);
 const initial=useRef<{id:string;version:number}>({id:initialData.id,version:initialData.version});
 const [state,setState]=useState('Prêt'),[error,setError]=useState('');const latest=useRef(payload),saved=useRef(server?JSON.stringify(server.payload):''),queue=useRef<Promise<any>>(Promise.resolve()),cancelled=useRef(false);
 latest.current=payload;
 const write=()=>{try{localStorage.setItem(storageKey,JSON.stringify({...initial.current,payload:latest.current}));}catch{}};
 const flush=()=>{queue.current=queue.current.catch(()=>{}).then(async()=>{if(cancelled.current)return initial.current;const data=latest.current,key=JSON.stringify(data);if(key===saved.current||(!data.lines.length&&!initial.current.version))return {...initial.current};setState('Enregistrement…');try{const r=await api('drafts',{...initial.current,type,status:'draft',payload:data});initial.current.version=r.version;saved.current=key;setState('Brouillon enregistré');setError('');write();return {...initial.current};}catch(e){setState('Non synchronisé');setError((e as Error).message);throw e;}});return queue.current;};
 const reset=()=>{cancelled.current=true;localStorage.removeItem(storageKey);};
 useEffect(()=>{write();const timer=setTimeout(()=>{void flush().catch(()=>{});},450);const unload=(e:BeforeUnloadEvent)=>{if(JSON.stringify(latest.current)!==saved.current&&latest.current.lines.length){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',unload);return()=>{clearTimeout(timer);window.removeEventListener('beforeunload',unload);};},[payload]);
 return {payload,setPayload,flush,reset,state,error,ref:initial};
}
export function downloadJson(name:string,value:unknown){const u=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
