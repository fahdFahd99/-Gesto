'use client';
import {useEffect,useState} from 'react';
import {Cross,Eye,EyeOff,ShieldCheck} from 'lucide-react';
import {api} from './client';
import {Button,Field} from './common';
type AuthStatus={firstAccount:boolean;setupConfigured:boolean};
export function AuthScreen({onLogin,initialStatus}:{onLogin:()=>void;initialStatus?:AuthStatus|null}){
 const [mode,setMode]=useState<'login'|'register'>(initialStatus?.firstAccount?'register':'login'),[status,setStatus]=useState<AuthStatus|null>(initialStatus??null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[show,setShow]=useState(false);
 useEffect(()=>{if(initialStatus)return;api('session').then(s=>{setStatus(s);if(s.firstAccount)setMode('register');}).catch(e=>setError(e.message));},[]);
 const registering=mode==='register';
 return <div className="login-page"><section className="login-card panel"><span className="login-mark"><Cross size={32}/></span><span className="eyebrow">PHARMACIE IJJAI · GESTION</span><h1>{registering?(status?.firstAccount?'Ouvrez votre officine':'Créez votre compte'):'Bienvenue dans votre officine'}</h1><p>{registering?(status?.firstAccount?'Créez votre compte titulaire pour commencer avec un catalogue vide.':'Rejoignez votre pharmacie avec l’invitation du titulaire.'):'Retrouvez votre catalogue, vos ventes et votre équipe.'}</p>
 <div className="auth-tabs" role="group" aria-label="Accès au compte"><button type="button" aria-pressed={!registering} onClick={()=>{setMode('login');setError('');}}>Se connecter</button><button type="button" aria-pressed={registering} onClick={()=>{setMode('register');setError('');}}>Créer un compte</button></div>
 <form key={mode} onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');const f=Object.fromEntries(new FormData(e.currentTarget));try{await api(mode,f);onLogin();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
 {registering?<>
 <Field label="Nom et prénom *"><input name="name" autoComplete="name" required minLength={2} maxLength={80}/></Field>
 <Field label="E-mail *"><input name="email" type="email" autoComplete="email" required maxLength={180}/></Field>
 {status?.firstAccount?<Field label="Nom de votre pharmacie *"><input name="pharmacyName" defaultValue="Pharmacie Ijjai" required minLength={2} maxLength={100}/></Field>:<Field label="Identifiant *"><input name="username" autoComplete="username" pattern="[A-Za-z0-9._-]{3,40}" required/><small>3 à 40 lettres, chiffres, points ou tirets.</small></Field>}
 </>:<Field label="E-mail ou identifiant"><input name="username" autoComplete="username" required maxLength={180} autoFocus/></Field>}
 <Field label={registering?'Mot de passe · 15 caractères minimum *':'Mot de passe'}><div className="password-field"><input name="password" type={show?'text':'password'} autoComplete={registering?'new-password':'current-password'} required minLength={registering?15:1} maxLength={128}/><button type="button" className="icon-btn" aria-label={show?'Masquer le mot de passe':'Afficher le mot de passe'} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></Field>
 {registering&&<><Field label="Confirmez le mot de passe *"><input name="confirmPassword" type={show?'text':'password'} autoComplete="new-password" required minLength={15} maxLength={128}/></Field><Field label={status?.firstAccount?'Code d’installation privé *':'Code d’invitation *'}><input name="code" type="password" autoComplete="off" required minLength={16} maxLength={256}/></Field><p className="note">{status?.firstAccount?'Ce code protège la création du premier compte. Utilisez celui de votre installation.':'Demandez ce code au titulaire. Chaque invitation est valable 48 heures pour l’e-mail indiqué.'}</p></>}
 {error&&<p className="inline-error" role="alert">{error}</p>}
 <Button loading={busy} disabled={registering&&!status}>{registering?'Créer mon compte':'Se connecter'}</Button>
 </form><p className="auth-footer"><ShieldCheck size={16}/> Compte personnel · Accès selon vos autorisations</p><details className="note"><summary>Mot de passe oublié ?</summary><p>Pour un employé, le titulaire peut réinitialiser le mot de passe dans Employés. Pour le titulaire, utilisez la procédure de récupération fournie dans le guide du projet.</p></details></section></div>;
}
